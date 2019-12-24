import {atom, reaction} from "@re-frame/atom"
import {
  scheduleMicroTask,
  createAnimationFrameScheduler,
  synchronousScheduler,
} from "@re-frame/schedulers"

/**
 * Creates an instance of a re-frame store. Like many flux implementations,
 * you dispatch events to the store, and those events are then processed by
 * a registered event handler. All handlers that you register with a store are
 * not shared with any other store instance; the same applies to subscriptions
 * and dispatched events.
 *
 * Once an event is dispatched, the store checks its id and uses that to look
 * up its corresponding event handler.
 *
 * ```js
 * const store = createStore()
 * store.registerEventDB('double', db => db * 2)
 * store.dispatch({ id: 'double' })
 * ```
 *
 * Here we registered an "EventDB" handler. There's another, higher-level
 * flavor of event handlers called "EventFX":
 *
 * - EventDB handlers always trigger precisely one side effect, called "db". The
 * "db" effect is responsible for updating the state of the store.
 * - EventFX handlers trigger one or more side effects. If one of those
 * side effects is named "db", then it also updates state of the store.
 *
 * Given this, you can think of EventDB handlers as EventFX handlers that only
 * ever trigger a "db" side effect. Or, put another way, EventDB handlers are
 * a subclass of EventFX handlers. It's a bit more nuanced than this in
 * reality, but it's a reasonable intuition to have at the start. For example,
 * the two handlers below are functionally equivalent:
 *
 * ```js
 * store.registerEventDB('double-db', db => db * 2)
 * store.registerEventFX('double-fx', ({ db }) => ({
 *  db: db * 2,
 * }))
 * ```
 *
 * @returns {object}
 */
export function createStore() {
  // APP_DB is an atom that contains the current state of the store.
  var APP_DB = atom()

  // --- Event Processing -----------------------------------------------------
  /**
   * Dispatched events are inserted into this FIFO queue. The queue manages its
   * own internal scheduler for processing events.
   */
  var EVENT_QUEUE = createEventQueue(processEvent)

  /**
   * The EVENT_QUEUE scheduler calls processEvent each time its scheduler finds
   * time to process an event. "Processing" means finding the handler that was
   * registered for the event and running it and its interceptors. After the
   * event handler is run, additional lifecycle events are triggered:
   *
   * 1. Schedule event for processing (this is EVENT_QUEUE)
   * 2. Some time later: process event <---- we are here
   * 3. Lookup and run event handler
   * 4. Notify postEventCallbacks that an event was processed
   * 5. Notify subscriptions if event handler changed APP_DB
   *
   * @param {Event} event - the event to process.
   * @noreturn
   */
  function processEvent(event) {
    var interceptors = getRegistration(EVENT, event.id)
    var context = {
      queue: interceptors,
      stack: [],
      effects: {},
      coeffects: {
        event: event,
      },
    }
    context = runInterceptors(context)
    notifyPostEventCallbacks(event)
    notifySubscriptions(context)
  }

  // --- Registrations --------------------------------------------------------

  var EVENT = "EVENT"
  var EFFECT = "EFFECT"
  var COEFFECT = "COEFFECT"
  var SUBSCRIPTION = "SUBSCRIPTION"
  var REGISTRATIONS = {}
  REGISTRATIONS[EVENT] = {}
  REGISTRATIONS[EFFECT] = {}
  REGISTRATIONS[COEFFECT] = {}
  REGISTRATIONS[SUBSCRIPTION] = {}

  function registerEventFX(id, interceptors, handler) {
    if (typeof interceptors === "function") {
      handler = interceptors
      interceptors = []
    }
    if (process.env.NODE_ENV === "development") {
      assertValidInterceptors(id, interceptors)
    }
    interceptors = flattenInterceptors([
      INJECT_DB,
      RUN_EFFECTS,
      interceptors,
      eventHandlerToInterceptor(handler),
    ])
    register(EVENT, id, interceptors)
  }

  function registerEventDB(id, interceptors, handler) {
    if (typeof interceptors === "function") {
      handler = interceptors
      interceptors = []
    }
    if (process.env.NODE_ENV === "development") {
      assertValidInterceptors(id, interceptors)
    }
    registerEventFX(id, interceptors, function(cofx, event) {
      return {
        db: handler(cofx.db, event),
      }
    })
  }

  function registerSubscription(id, dependencies, handler) {
    if (typeof dependencies === "function") {
      handler = dependencies
      dependencies = undefined
    }

    // TODO: refactor + test. Not yet officially supported in public API
    if (dependencies && dependencies.length) {
      var ratom
      register(SUBSCRIPTION, id, function(query) {
        if (ratom) {
          return ratom.deref()
        }

        var subscriptions = dependencies.map(function(query) {
          return subscribe(query)
        })
        ratom = reaction(function() {
          return handler.apply(
            null,
            [query].concat(
              subscriptions.map(function(sub) {
                return sub.deref()
              })
            )
          )
        })
        var dispose = ratom.dispose
        ratom.dispose = function() {
          for (var i = 0; i < subscriptions.length; i++) {
            subscriptions[i].dispose()
          }
          dispose()
          ratom = undefined
        }
      })
    } else {
      register(SUBSCRIPTION, id, handler)
    }
  }

  function register(kind, id, registration) {
    REGISTRATIONS[kind][id] = registration
  }

  function getRegistration(kind, id) {
    return REGISTRATIONS[kind][id]
  }

  // --- Dispatch -------------------------------------------------------------
  function dispatch(event) {
    if (process.env.NODE_ENV === "development") {
      assertValidEvent(event)
    }
    EVENT_QUEUE.push(event)
  }

  function dispatchSync(event) {
    if (process.env.NODE_ENV === "development") {
      assertValidEvent(event)
    }
    processEvent(event)
  }

  // --- Coeffects ------------------------------------------------------------
  function registerCoeffect(id, handler) {
    register(COEFFECT, id, handler)
  }

  function injectCoeffect(coeffectId) {
    return {
      id: "inject-coeffect",
      before: function before(context) {
        var handler = getRegistration(COEFFECT, coeffectId)
        context.coeffects = handler(context.coeffects)
        return context
      },
    }
  }

  // Inserts the current app db into coeffects as "db".
  registerCoeffect("db", function(ctx) {
    ctx.db = APP_DB.deref()
    return ctx
  })

  // The `db` coeffect is used in all event handlers, so we save a single
  // reference to its interceptor as an optimization.
  var INJECT_DB = injectCoeffect("db")

  // --- Built-in Interceptors ------------------------------------------------
  var RUN_EFFECTS = {
    id: "run-effects",
    after: function after(context) {
      if (!context.effects) {
        if (process.env.NODE_ENV === "development") {
          var eventId = context.coeffects.event.id
          console.warn(
            'EventFX "' +
              eventId +
              '" did not return any effects, which is likely a mistake. To signal that you do not want to run any effects, return an empty object: {}.'
          )
        }
        return context
      }
      for (var effectId in context.effects) {
        if (process.env.NODE_ENV === "development") {
          assertValidEffect(context, effectId)
        }
        var handler = getRegistration(EFFECT, effectId)
        handler(context.effects[effectId])
      }
      return context
    },
  }

  // --- Subscriptions --------------------------------------------------------
  var ACTIVE_SUBSCRIPTIONS = []

  function query(query) {
    if (process.env.NODE_ENV === "development") {
      assertValidQuery(query)
    }

    // TODO: should recompute if already in cache? Currently differs from subscribe()
    var handler = getRegistration(SUBSCRIPTION, query.id)
    return handler(APP_DB.deref(), query)
  }

  function subscribe(query) {
    if (process.env.NODE_ENV === "development") {
      assertValidQuery(query)
    }

    var subscription = findCachedSubscription(query)
    if (subscription) {
      subscription._refs++
      return subscription
    }

    subscription = atom()
    subscription._refs = 1

    // A subscription is an atom, but it should be considered read-only out in
    // userland since its internal value is computed. Remove all public API's
    // that would allow its value to be improperly modified.
    var reset = subscription.reset
    var dispose = subscription.dispose
    delete subscription.reset
    delete subscription.swap

    subscription.dispose = function() {
      subscription._refs--
      if (subscription._refs === 0) {
        ACTIVE_SUBSCRIPTIONS.splice(
          ACTIVE_SUBSCRIPTIONS.indexOf(subscription),
          1
        )
        dispose()
      }
    }

    subscription._reset = reset
    subscription._query = query
    subscription._handler = getRegistration(SUBSCRIPTION, query.id)
    var db = APP_DB.deref()
    if (db) {
      subscription._reset(subscription._handler(db, query))
    }
    ACTIVE_SUBSCRIPTIONS.push(subscription)
    return subscription
  }

  function findCachedSubscription(query) {
    var id = query.id
    for (var i = 0; i < ACTIVE_SUBSCRIPTIONS.length; i++) {
      var existingQuery = ACTIVE_SUBSCRIPTIONS[i]._query
      if (existingQuery.id === id && deepEqual(query, existingQuery)) {
        return ACTIVE_SUBSCRIPTIONS[i]
      }
    }
  }

  var subscriptionScheduler =
    typeof window !== "undefined"
      ? createAnimationFrameScheduler()
      : synchronousScheduler

  function notifySubscriptions(context) {
    if (!context.effects) return

    var prevDB = context.coeffects.db
    var nextDB = context.effects.db
    if (nextDB && nextDB !== prevDB) {
      subscriptionScheduler(function() {
        for (var i = 0; i < ACTIVE_SUBSCRIPTIONS.length; i++) {
          var subscription = ACTIVE_SUBSCRIPTIONS[i]
          var prevValue = subscription.deref()
          var nextValue = subscription._handler(nextDB, subscription._query)
          if (nextValue !== prevValue) {
            subscription._reset(nextValue)
          }
        }
      })
    }
  }

  // --- Utilities ------------------------------------------------------------
  function assertValidQuery(query) {
    if (!query || typeof query !== "object" || !query.id) {
      throw new Error(
        'You called subscribe() with an invalid query. A query is an object with an "id" key.'
      )
    }
    if (!getRegistration(SUBSCRIPTION, query.id)) {
      throw new Error(
        'You attempted to subscribe to "' +
          query.id +
          '", but no subscription has been registered with that id.'
      )
    }
  }

  function assertValidEffect(context, effectId) {
    if (!getRegistration(EFFECT, effectId)) {
      var eventId = context.coeffects.event.id
      throw new Error(
        'The EventFX handler "' +
          eventId +
          '" attempted to create an effect "' +
          effectId +
          '", but that effect has not been registered.'
      )
    }
  }

  function assertValidEvent(event) {
    if (!event || typeof event !== "object" || !event.id) {
      throw new Error(
        'You dispatched an invalid event. An event is an object that has an "id" key.'
      )
    }
    if (!getRegistration(EVENT, event.id)) {
      throw new Error(
        "You dispatched an event that isn't registered with the store. " +
          'Please register "' +
          event.id +
          '" with store.registerEventDB() or store.registerEventFX().'
      )
    }
  }

  // --- Lifecycle Hooks ------------------------------------------------------
  /**
   * List of callbacks that should be invoked after an event is processed.
   * Callbacks are added with "store.registerPostEventCallback", and removed
   * with "store.removePostEventCallback".
   */
  var POST_EVENT_CALLBACKS = []

  function registerPostEventCallback(cb) {
    POST_EVENT_CALLBACKS.push(cb)
  }
  function removePostEventCallback(cb) {
    POST_EVENT_CALLBACKS.splice(POST_EVENT_CALLBACKS.indexOf(cb), 1)
  }
  function notifyPostEventCallbacks(event) {
    if (POST_EVENT_CALLBACKS.length) {
      for (var i = 0; i < POST_EVENT_CALLBACKS.length; i++) {
        POST_EVENT_CALLBACKS[i](event)
      }
    }
  }

  // --- Public API -----------------------------------------------------------
  var store = {
    dispatch: dispatch,
    dispatchSync: dispatchSync,
    query: query,
    subscribe: subscribe,
    registerEventDB: registerEventDB,
    registerEventFX: registerEventFX,
    registerEffect: registerEffect,
    registerSubscription: registerSubscription,
    registerCoeffect: registerCoeffect,
    injectCoeffect: injectCoeffect,
    registerPostEventCallback: registerPostEventCallback,
    removePostEventCallback: removePostEventCallback,
  }

  // --- Built-in Effects -----------------------------------------------------
  function registerEffect(id, factory) {
    register(EFFECT, id, factory(store))
  }

  registerEffect("db", function(_store) {
    return function(nextDB) {
      APP_DB.reset(nextDB)
    }
  })

  registerEffect("dispatch", function(store) {
    return function(event) {
      store.dispatch(event)
    }
  })

  return store
}

// Possible event queue states
// prettier-ignore
var IDLE       = 0,
    SCHEDULED  = 1,
    RUNNING    = 2

function createEventQueue(processEvent) {
  var _queue = []
  var _state = IDLE

  function push(event) {
    _queue.push(event)
    if (_state == IDLE) {
      _scheduleProcessor()
    }
  }

  function _scheduleProcessor() {
    _state = SCHEDULED
    scheduleMicroTask(_runQueue)
  }

  function _runQueue() {
    _state = RUNNING

    // cache the number of events to process so that only the events that were
    // in the queue at the start of the run are processed. Any that are added
    // during the run should be processed in the next batch.
    for (var i = 0, len = _queue.length; i < len; i++) {
      try {
        processEvent(_queue[i])
      } catch (e) {
        // TODO: surface this exception
        // TODO: how should/could events recover from an exception? This
        // queue-emptying behavior mimics Clojure re-frame until I have answers.
        _state = IDLE
        _queue = []
        return
      }
    }
    _state = IDLE
    _queue = _queue.slice(i)
    if (_queue.length) {
      _scheduleProcessor()
    }
  }

  return {push: push}
}

function eventHandlerToInterceptor(handler) {
  return {
    id: "event-handler",
    before: function(context) {
      context.effects = handler(context.coeffects, context.coeffects.event)
      return context
    },
  }
}

function runInterceptors(context) {
  context = runInterceptorQueue(context, "before")
  context = switchDirections(context)
  context = runInterceptorQueue(context, "after")
  return context
}

function runInterceptorQueue(context, direction) {
  while (context.queue.length) {
    var interceptor = context.queue[0]
    context.queue = context.queue.slice(1)
    context.stack = [interceptor].concat(context.stack)
    if (interceptor[direction]) {
      context = interceptor[direction](context)
    }
  }
  return context
}

function switchDirections(context) {
  context.queue = context.stack
  context.stack = []
  return context
}

/**
 * Flattens an array interceptors because "interceptors" can be an arbitrarily
 * deep array. Deep arrays allow patterns such as:
 *
 * const STANDARD_INTERCEPTORS = [InterceptorA, InterceptorB, ...]
 * store.registerEventDB("foo", [STANDARD_INTERCEPTORS, MyInterceptor], handler)
 *
 * Flattening the interceptors internally makes for a nicer public API,
 * since users can easily share interceptors — single or multiple —
 * without having to ensure they are properly flattened.
 *
 * @param {object[]} interceptors - arbitrarily nested array of interceptors
 * @returns {object[]} flattened interceptors
 */
function flattenInterceptors(interceptors) {
  var flattened = []

  for (var i = 0; i < interceptors.length; i++) {
    var entry = interceptors[i]
    if (Array.isArray(entry)) {
      entry = flattenInterceptors(entry)
      for (var j = 0; j < entry.length; j++) {
        flattened[flattened.length] = entry[j]
      }
    } else {
      flattened[flattened.length] = entry
    }
  }
  return flattened
}

function assertValidInterceptors(eventId, interceptors) {
  for (var i = 0; i < interceptors.length; i++) {
    var interceptor = interceptors[i]
    var err // Will read as: Interceptor at index N {{err}}
    if (!interceptor) {
      err = "was undefined. Check for spelling mistakes or missing imports."
    } else if (typeof interceptor === "function") {
      err =
        "was a function. This likely means you forgot to call the function in order to create the interceptor."
    } else if (typeof interceptor !== "object") {
      err =
        "was an invalid type. Received " +
        typeof interceptor +
        " when it should be an object."
    } else if (!interceptor.id) {
      err = 'was missing an "id" key.'
    } else if (!interceptor.before && !interceptor.after) {
      err = 'was missing a "before" or "after" hook. At least one is required.'
    } else if (interceptor.before && typeof interceptor.before !== "function") {
      err = 'had a "before" hook but its value was not a function.'
    } else if (interceptor.after && typeof interceptor.after !== "function") {
      err = 'had an "after" hook but its value was not a function.'
    }
    if (err) {
      var identifier =
        interceptor && interceptor.id
          ? 'with id "' + interceptor + '"'
          : "at index " + i

      throw new Error(
        'Invalid interceptor provided when registering event handler "' +
          eventId +
          '": interceptor ' +
          identifier +
          " " +
          err
      )
    }
  }
}

// Forked from Evgeny Poberezkin's MIT-licensed fast-deep-equal package because
// it still uses CommonJS (we need ESM).
function deepEqual(a, b) {
  if (a === b) return true
  if (a && b && typeof a == "object" && typeof b == "object") {
    if (a.constructor !== b.constructor) {
      return false
    }
    var length, i, keys
    if (Array.isArray(a)) {
      length = a.length
      if (length != b.length) {
        return false
      }
      for (i = length; i-- !== 0; ) {
        if (!deepEqual(a[i], b[i])) {
          return false
        }
      }
      return true
    }
    if (a.constructor === RegExp) {
      return a.source === b.source && a.flags === b.flags
    }
    // Inserted existence check to handle null prototypes
    if (a.valueOf !== Object.prototype.valueOf && a.valueOf && b.valueOf) {
      return a.valueOf() === b.valueOf()
    }
    // From fork, but do we need it?
    // if (a.toString !== Object.prototype.toString) {
    //   return a.toString() === b.toString()
    // }
    keys = Object.keys(a)
    length = keys.length
    if (length !== Object.keys(b).length) {
      return false
    }
    for (i = length; i-- !== 0; ) {
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) {
        return false
      }
    }
    for (i = length; i-- !== 0; ) {
      var key = keys[i]
      if (!deepEqual(a[key], b[key])) {
        return false
      }
    }
    return true
  }
  return a !== a && b !== b
}

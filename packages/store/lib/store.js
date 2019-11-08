import {atom, reaction} from "@re-frame/atom"
import {createEventQueue} from "./event-queue"
import {
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
 * up its corresponding event handler. In the example below, "double" is the
 * event id.
 *
 * ```js
 * const store = createStore()
 * store.event('double', db => db * 2)
 * store.dispatch(['double'])
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
 * store.event('double-db', db => db * 2)
 * store.event.fx('double-fx', ({ db }) => ({
 *  db: db * 2,
 * }))
 * ```
 *
 * @param {object} [opts] - optional configuration
 * @param {object[]} [opts.interceptors] - global interceptors
 * @returns {object}
 */
export function createStore(opts) {
  // APP_DB is an atom that contains the current state of the store.
  var APP_DB = atom()

  // Interceptors that are run on every event
  var GLOBAL_INTERCEPTORS = (opts && opts.interceptors) || []

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
    var interceptors = getRegistration(EVENT, event[0])
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

  function registerEventDB(id, interceptors, handler) {
    if (typeof interceptors === "function") {
      handler = interceptors
      interceptors = []
    }

    if (process.env.NODE_ENV === "development") {
      assertValidInterceptors(id, interceptors)
    }
    register(
      EVENT,
      id,
      flattenInterceptors([
        INJECT_DB,
        RUN_EFFECTS,
        GLOBAL_INTERCEPTORS,
        interceptors,
        dbHandlerToInterceptor(handler),
      ])
    )
  }

  function registerEventFX(id, interceptors, handler) {
    if (typeof interceptors === "function") {
      handler = interceptors
      interceptors = []
    }

    if (process.env.NODE_ENV === "development") {
      assertValidInterceptors(id, interceptors)
    }
    register(
      EVENT,
      id,
      flattenInterceptors([
        INJECT_DB,
        RUN_EFFECTS,
        GLOBAL_INTERCEPTORS,
        interceptors,
        fxHandlerToInterceptor(handler),
      ])
    )
  }

  function registerEffect(id, handler) {
    register(EFFECT, id, handler)
  }

  function registerSubscription(id, queries, handler) {
    // TODO: refactor + test. Not yet officially supported in public API
    if (queries.length) {
      var ratom
      register(SUBSCRIPTION, id, function(query) {
        if (ratom) {
          return ratom.deref()
        }

        var subscriptions = queries.map(function(query) {
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

  // --- Built-in Effects -----------------------------------------------------
  registerEffect("db", function(nextDB) {
    APP_DB.reset(nextDB)
  })

  registerEffect("dispatch", function(event) {
    dispatch(event)
  })

  registerEffect("dispatchN", function(events) {
    for (var i = 0; i < events.length; i++) {
      dispatch(events[i])
    }
  })

  // --- Coeffects ------------------------------------------------------------
  function registerCoeffect(id, handler) {
    register(COEFFECT, id, handler)
  }

  function inject(contextId) {
    return {
      id: "inject",
      before: function before(context) {
        var handler = getRegistration(COEFFECT, contextId)
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
  var INJECT_DB = inject("db")

  // --- Built-in Interceptors ------------------------------------------------
  var RUN_EFFECTS = {
    id: "run-effects",
    after: function after(context) {
      if (!context.effects) {
        if (process.env.NODE_ENV === "development") {
          var eventId = context.coeffects.event[0]
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

    var handler = getRegistration(SUBSCRIPTION, query[0])
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
    subscription._handler = getRegistration(SUBSCRIPTION, query[0])
    var db = APP_DB.deref()
    if (db) {
      subscription._reset(subscription._handler(db, query))
    }
    ACTIVE_SUBSCRIPTIONS.push(subscription)
    return subscription
  }

  function findCachedSubscription(query) {
    var id = query[0]

    for (var i = 0; i < ACTIVE_SUBSCRIPTIONS.length; i++) {
      var subscription = ACTIVE_SUBSCRIPTIONS[i]
      if (subscription._query[0] !== id) {
        continue
      }
      var matched = true
      for (var j = 1; j < subscription._query.length; j++) {
        if (query[j] !== subscription._query[j]) {
          matched = false
          break
        }
      }
      if (matched) {
        return subscription
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
      subscriptionScheduler(() => {
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
    if (!Array.isArray(query)) {
      throw new Error(
        "You called subscribe() with an invalid query. A query is an array that looks like [id] or [id, ...params]."
      )
    }
    if (!getRegistration(SUBSCRIPTION, query[0])) {
      throw new Error(
        'You attempted to subscribe to "' +
          query[0] +
          '", but no subscription has been registered with that id.'
      )
    }
  }

  function assertValidEffect(context, effectId) {
    if (!getRegistration(EFFECT, effectId)) {
      var eventId = context.coeffects.event[0]
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
    if (!Array.isArray(event)) {
      throw new Error(
        "You dispatched an invalid event. An event is an array that looks like [id] or [id, payload]."
      )
    }
    if (!getRegistration(EVENT, event[0])) {
      throw new Error(
        "You dispatched an event that isn't registered with the store. " +
          'Please register "' +
          event[0] +
          '" with store.event() or store.event.fx().'
      )
    }
  }

  // --- Lifecycle Hooks ------------------------------------------------------
  /**
   * List of callbacks that should be invoked after an event is processed.
   * Callbacks are added with "store.addPostEventCallback", and removed
   * with "store.removePostEventCallback".
   */
  var POST_EVENT_CALLBACKS = []

  function addPostEventCallback(cb) {
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
    event: registerEventDB,
    effect: function(id, factory) {
      registerEffect(id, factory(store))
    },
    context: registerCoeffect,
    inject: inject,
    computed: function(id, queries, handler) {
      if (typeof queries === "function") {
        handler = queries
        queries = []
      }
      return registerSubscription(id, queries, handler)
    },
    addPostEventCallback: addPostEventCallback,
    removePostEventCallback: removePostEventCallback,
  }
  store.event.fx = registerEventFX

  return store
}

// A DB handler receives the current db and event and return a new db.
// This interceptor wraps that handler so that its return value is
// automatically applied to the "db" effect.
function dbHandlerToInterceptor(handler) {
  return {
    id: "db-handler",
    before: function(context) {
      var db = context.coeffects.db
      var event = context.coeffects.event
      context.effects.db = handler(db, event)
      return context
    },
  }
}

// An FX handler takes coeffects and returns effects. Where a DB handler
// returns `effects.db`, this FX handler returns the entire `effects`
// object. This gives it a chance to do more  than just update the db.
function fxHandlerToInterceptor(handler) {
  return {
    id: "fx-handler",
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
 * store.event("foo", [STANDARD_INTERCEPTORS, MyInterceptor], handler)
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

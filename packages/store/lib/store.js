import {atom} from "@re-frame/atom"
import {assoc, flatten, shallowClone} from "@re-frame/utils"
import {createEventQueue} from "@re-frame/event-queue"

/**
 * Creates an instance of a re-frame store. Like many flux implementations,
 * you dispatch events to the store; those events are then processed by a
 * their corresponding event handler. Any handlers you register with this
 * store are not shared with any other store instance. and the same applies
 * to dispatched events and subscriptions.
 *
 * Once an event is dispatched, the store checks its id and uses that to look
 * up its corresponding event handler. In the example below, "double" is the
 * event id.
 *
 * ```js
 * const store = createStore()
 * store.registerEventDB('double', db => db * 2)
 * store.dispatch(['double'])
 * ```
 *
 * Here we registered an "EventDB" handler. There's another flavor of event
 * handler, called "EventFX":
 *
 * - EventDB handlers always change the state of the store (called "db").
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
 * @param {*} [initialState] - the initial state of the store.
 *
 * @typedef {object} Store
 * @property {() => *} getState
 * @property {(Event) => void} dispatch
 * @property {(Event) => void} dispatchSync
 * @property {(Query) => *} query
 * @property {(Query) => object} subscribe
 * @property {(string) => object} injectCoeffect
 * @property {(string, Function) => void} registerCoeffect
 * @property {(string, Function) => void} registerEventDB
 * @property {(string, Function) => void} registerEventFX
 * @property {(string, Function) => void} registerEffect
 * @property {(string, Function) => void} registerSubscription
 * @property {(Function) => void} addPostEventCallback
 * @property {(Function) => void} removePostEventCallback
 * @returns {Store}
 */
export function createStore(initialState, opts) {
  var __DEV__ = process.env.NODE_ENV !== "production"
  if (opts && opts.mode) {
    __DEV__ = opts.mode !== "production"
  }

  // APP_DB is an atom that contains the current state of the store.
  var APP_DB = atom(initialState)

  // --- Event Processing -----------------------------------------------------
  /**
   * Dispatched events are inserted into this FIFO queue. The queue manages its
   * own internal scheduler for processing events.
   */
  var EVENT_QUEUE = createEventQueue(processEvent)

  /**
   * Stores callbacks that should be invoked after an event is processed.
   * Callbacks are added with "store.addPostEventCallback", and removed
   * with "store.removePostEventCallback".
   */
  var postEventCallbacks = []

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
    context = runInterceptorQueue(context, "before")
    context = switchDirections(context)
    context = runInterceptorQueue(context, "after")
    if (postEventCallbacks.length) {
      for (var i = 0; i < postEventCallbacks.length; i++) {
        postEventCallbacks[i](event)
      }
    }
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

    if (__DEV__) {
      assertValidInterceptors(
        interceptors,
        'Invalid interceptor provided when registering EventDB handler "' +
          id +
          '": '
      )
    }
    register(
      EVENT,
      id,
      flatten([
        INJECT_DB,
        RUN_EFFECTS,
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

    if (__DEV__) {
      assertValidInterceptors(
        interceptors,
        'Invalid interceptor provided when registering EventFX handler "' +
          id +
          '": '
      )
    }
    register(
      EVENT,
      id,
      flatten([
        INJECT_DB,
        RUN_EFFECTS,
        interceptors,
        fxHandlerToInterceptor(handler),
      ])
    )
  }

  function registerEffect(id, handler) {
    register(EFFECT, id, handler)
  }

  function registerSubscription(id, handler) {
    register(SUBSCRIPTION, id, handler)
  }

  function register(kind, id, registration) {
    REGISTRATIONS = assoc(REGISTRATIONS, [kind, id], registration)
  }

  function getRegistration(kind, id) {
    return REGISTRATIONS[kind][id]
  }

  // --- Dispatch -------------------------------------------------------------
  function dispatch(event) {
    if (__DEV__) {
      validateEvent(event)
    }
    EVENT_QUEUE.push(event)
  }

  function dispatchSync(event) {
    if (__DEV__) {
      validateEvent(event)
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

  function injectCoeffect(id) {
    return {
      id: "inject-coeffect",
      before: function before(context) {
        var handler = getRegistration(COEFFECT, id)
        return assoc(context, ["coeffects"], handler(context.coeffects))
      },
    }
  }

  // Inserts the current app db into coeffects as "db".
  registerCoeffect("db", function injectDB(coeffects) {
    return assoc(coeffects, ["db"], APP_DB.deref())
  })

  // The `db` coeffect is used in all event handlers, so we save a single
  // reference to its interceptor as an optimization.
  var INJECT_DB = injectCoeffect("db")

  // --- Built-in Interceptors ------------------------------------------------
  var RUN_EFFECTS = {
    id: "run-effects",
    after: function after(context) {
      for (var effectId in context.effects) {
        if (__DEV__) {
          validateEffect(context, effectId)
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
    if (__DEV__) {
      validateQuery(query)
    }

    var handler = getRegistration(SUBSCRIPTION, query[0])
    return handler(APP_DB.deref(), query)
  }

  function subscribe(query) {
    if (__DEV__) {
      validateQuery(query)
    }

    var subscription = atom()
    var reset = subscription.reset
    delete subscription.reset
    delete subscription.swap

    var id = query[0]
    subscription.query = query
    subscription._recompute = function(db) {
      var handler = getRegistration(SUBSCRIPTION, id)
      var nextValue = handler(db, query)
      if (nextValue !== subscription.deref()) {
        reset(nextValue)
      }
    }
    subscription._recompute(APP_DB.deref())
    ACTIVE_SUBSCRIPTIONS.push(subscription)
    return subscription
  }

  function notifySubscriptions() {
    const db = APP_DB.deref()
    for (var i = 0; i < ACTIVE_SUBSCRIPTIONS.length; i++) {
      ACTIVE_SUBSCRIPTIONS[i]._recompute(db)
    }
  }

  addPostEventCallback(notifySubscriptions)

  // --- Utilities ------------------------------------------------------------
  function validateQuery(query) {
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

  function validateEffect(context, effectId) {
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

  function validateEvent(event) {
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
          '" with registerEventDB or registerEventFX.'
      )
    }
  }

  // --- Lifecycle Hooks ------------------------------------------------------
  function addPostEventCallback(cb) {
    postEventCallbacks.push(cb)
  }
  function removePostEventCallback(cb) {
    postEventCallbacks.splice(postEventCallbacks.indexOf(cb), 1)
  }

  // --- Public API -----------------------------------------------------------
  return {
    getState: APP_DB.deref,
    dispatch: dispatch,
    dispatchSync: dispatchSync,
    query: query,
    subscribe: subscribe,
    injectCoeffect: injectCoeffect,
    registerCoeffect: registerCoeffect,
    registerEventDB: registerEventDB,
    registerEventFX: registerEventFX,
    registerEffect: registerEffect,
    registerSubscription: registerSubscription,
    addPostEventCallback: addPostEventCallback,
    removePostEventCallback: removePostEventCallback,
  }
}

// A DB handler receives the current db and event and return a new db.
// This interceptor wraps that handler so that its return value is
// automatically applied to the "db" effect.
function dbHandlerToInterceptor(handler) {
  return {
    id: "db-handler",
    before: function before(context) {
      var db = context.coeffects.db
      var event = context.coeffects.event
      return assoc(context, ["effects", "db"], handler(db, event))
    },
  }
}

// An FX handler takes coeffects and returns effects. Where a DB handler
// returns `effects.db`, this FX handler returns the entire `effects`
// object. This gives it a chance to do more  than just update the db.
function fxHandlerToInterceptor(handler) {
  return {
    id: "fx-handler",
    before: function before(context) {
      var coeffects = context.coeffects
      return assoc(context, ["effects"], handler(coeffects, coeffects.event))
    },
  }
}

function runInterceptorQueue(context, direction) {
  while (context.queue.length) {
    var interceptor = context.queue[0]
    context = shallowClone(context)
    context.queue = context.queue.slice(1)
    context.stack = [interceptor].concat(context.stack)
    if (interceptor[direction]) {
      context = interceptor[direction](context)
    }
  }
  return context
}

function switchDirections(context) {
  context = shallowClone(context)
  context.queue = context.stack
  context.stack = []
  return context
}

function assertValidInterceptors(interceptors, errorPrefix) {
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
          ? 'Interceptor with id "' + interceptor.id + '"'
          : "Interceptor at index " + i
      throw new Error(errorPrefix + identifier + " " + err)
    }
  }
}

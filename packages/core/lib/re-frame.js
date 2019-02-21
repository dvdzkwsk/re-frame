import {assoc, flatten} from './utilities.js'
import {createAtom} from './create-atom.js'
import {createEventQueue} from './create-event-queue.js'
import {
  assertValidInterceptors,
  dbHandlerToInterceptor,
  fxHandlerToInterceptor,
  runInterceptorQueue,
  switchDirections,
} from './interceptors.js'

/**
 * Creates an instance of a re-frame store. Like many flux implementations,
 * you dispatch events to the store, and each event is processed by its
 * registered event handler. Because this function creates an instance of
 * a store, the events you dispatch, and handlers you register, are unique
 * to your store.
 *
 * So, once an event is dispatched, the store checks its id and uses that
 * to look up its corresponding event handler. In the example below,
 * "double" is the event id.
 *
 * ```js
 * const store = createStore()
 * store.registerEventDB('double', db => db * 2)
 * store.dispatch(['double'])
 * ```
 *
 * There are two primary flavors of event handlers:
 *
 * - EventDB handlers always change the state of the store (called "db").
 * - EventFX handlers trigger one or more side effects. If one of those
 * side effects is named "db", then it also updates state of the store.
 *
 * Given this, you can think of EventDB handlers as EventFX handlers that
 * only ever trigger a "db" side effect. It's a bit more nuanced than this
 * in reality, but for starters it's reasonable to think of these as
 * equivalent:
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
 * @property {(Event) => void} dispatch
 * @property {(Event) => void} dispatchSync
 * @property {(Query) => object} subscribe
 * @property {(string) => object} injectCoeffect
 * @property {(string, Function) => void} registerCoeffect
 * @property {(string, Function) => void} registerEventDB
 * @property {(string, Function) => void} registerEventFX
 * @property {(string, Function) => void} registerEffect
 * @property {(string, Function) => void} registerSubscription
 * @returns {Store}
 */
export function createStore(initialState) {
  // APP_DB is an atom that contains the current state of the store.
  var APP_DB = createAtom(initialState)

  // --- Event Processing -----------------------------------------------------
  /**
   * Dispatched events are inserted into this FIFO queue. The queue manages its
   * own internal scheduler for processing events.
   */
  var EVENT_QUEUE = createEventQueue(processEvent)

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
    context = runInterceptorQueue(context, 'before')
    context = switchDirections(context)
    context = runInterceptorQueue(context, 'after')
  }

  // --- Registrations --------------------------------------------------------
  var EVENT = 'EVENT'
  var EFFECT = 'EFFECT'
  var COEFFECT = 'COEFFECT'
  var SUBSCRIPTION = 'SUBSCRIPTION'
  var REGISTRATIONS = {}
  REGISTRATIONS[EVENT] = {}
  REGISTRATIONS[EFFECT] = {}
  REGISTRATIONS[COEFFECT] = {}
  REGISTRATIONS[SUBSCRIPTION] = {}

  function registerEventDB(id, interceptors, handler) {
    if (typeof interceptors === 'function') {
      handler = interceptors
      interceptors = []
    }

    if (process.env.NODE_ENV === 'development') {
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
    if (typeof interceptors === 'function') {
      handler = interceptors
      interceptors = []
    }

    if (process.env.NODE_ENV === 'development') {
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
    if (process.env.NODE_ENV === 'development') {
      validateEvent(event)
    }
    EVENT_QUEUE.push(event)
  }

  function dispatchSync(event) {
    if (process.env.NODE_ENV === 'development') {
      validateEvent(event)
    }
    processEvent(event)
  }

  // --- Built-in Effects -----------------------------------------------------
  registerEffect('db', function(nextDB) {
    APP_DB.reset(nextDB)
  })

  registerEffect('dispatch', function(event) {
    dispatch(event)
  })

  registerEffect('dispatchN', function(events) {
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
      id: 'inject-coeffect',
      before: function before(context) {
        var handler = getRegistration(COEFFECT, id)
        return assoc(context, ['coeffects'], handler(context.coeffects))
      },
    }
  }

  // Inserts the current app db into coeffects as "db".
  registerCoeffect('db', function injectDB(coeffects) {
    return assoc(coeffects, ['db'], APP_DB.deref())
  })

  // The `db` coeffect is used in all event handlers, so we save a single
  // reference to its interceptor as an optimization.
  var INJECT_DB = injectCoeffect('db')

  // --- Built-in Interceptors ------------------------------------------------
  var RUN_EFFECTS = {
    id: 'run-effects',
    after: function after(context) {
      for (var effectId in context.effects) {
        if (process.env.NODE_ENV === 'development') {
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

  function subscribe(query) {
    if (process.env.NODE_ENV === 'development') {
      validateQuery(query)
    }
    var atom = createAtom()
    var reset = atom.reset
    atom.swap = atom.reset = function() {
      throw new Error(
        'Cannot call swap() or reset() on an atom created by subscribe().'
      )
    }

    atom._recompute = function(db) {
      var handler = getRegistration(SUBSCRIPTION, query[0])
      var nextValue = handler(db, query)
      if (nextValue !== atom.deref()) {
        reset(nextValue)
      }
    }
    atom._recompute(APP_DB.deref())
    atom._dispose = function() {
      ACTIVE_SUBSCRIPTIONS = ACTIVE_SUBSCRIPTIONS.filter(function(sub) {
        return sub !== atom
      })
    }
    ACTIVE_SUBSCRIPTIONS = ACTIVE_SUBSCRIPTIONS.concat(atom)
    return atom
  }

  function notifySubscriptions(prevDB, nextDB) {
    for (var i = 0; i < ACTIVE_SUBSCRIPTIONS.length; i++) {
      ACTIVE_SUBSCRIPTIONS[i]._recompute(nextDB)
    }
  }

  APP_DB.watch(notifySubscriptions)

  // --- Utilities ------------------------------------------------------------
  function validateQuery(query) {
    if (!Array.isArray(query)) {
      throw new Error(
        'You called subscribe() with an invalid query. A query is an array that looks like [id] or [id, ...params].'
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
        'You dispatched an invalid event. An event is an array that looks like [id] or [id, payload].'
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

  // --- Public API -----------------------------------------------------------
  return {
    dispatch: dispatch,
    dispatchSync: dispatchSync,
    subscribe: subscribe,
    injectCoeffect: injectCoeffect,
    registerCoeffect: registerCoeffect,
    registerEventDB: registerEventDB,
    registerEventFX: registerEventFX,
    registerEffect: registerEffect,
    registerSubscription: registerSubscription,
  }
}

// --- Exported Interceptors --------------------------------------------------
export {path, payload} from './interceptors.js'

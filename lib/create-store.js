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

export function createStore(initialState) {
  // APP_DB is an atom that contains the current state of the store.
  //
  // When an event is dispatched to the store, we check whether it produced
  // a "db" effect, which signals that it wants to update the store state.
  // This effect happens for every EventDB handler, and only sometimes
  // for EventFX handlers.
  //
  // registerEventDB('increment', db => db + 1)
  // registerEventFX('double', cofx => ({
  //   db: cofx.db * 2,
  // }))
  var APP_DB = createAtom(initialState)

  // --- Event Processing ------------------------------
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

  // Dispatched events are inserted into this FIFO queue. The queue manages its
  // own internal scheduler for processing events.
  var EVENT_QUEUE = createEventQueue(processEvent)

  // --- Registrations ---------------------------------
  var EVENT = 'event'
  var EFFECT = 'effect'
  var COEFFECT = 'coeffect'
  var REGISTRATIONS = {}
  REGISTRATIONS[EVENT] = {}
  REGISTRATIONS[EFFECT] = {}
  REGISTRATIONS[COEFFECT] = {}

  function register(kind, id, registration) {
    REGISTRATIONS = assoc(REGISTRATIONS, [kind, id], registration)
  }

  function getRegistration(kind, id) {
    return REGISTRATIONS[kind][id]
  }

  function registerEventDB(id, interceptors, handler) {
    if (typeof interceptors === 'function') {
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
    if (typeof interceptors === 'function') {
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

  // --- Dispatch -------------------------------------
  function dispatch(event) {
    if (__DEV__) {
      assertValidEventShape(event)
      assertEventRegistrationExists(event)
    }
    EVENT_QUEUE.push(event)
  }

  function dispatchSync(event) {
    if (__DEV__) {
      assertValidEventShape(event)
      assertEventRegistrationExists(event)
    }
    processEvent(event)
  }

  // --- Built-in Effects ------------------------------
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

  // --- Coeffects -------------------------------------
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

  // --- Built-in Interceptors ------------------------
  var RUN_EFFECTS = {
    id: 'run-effects',
    after: function after(context) {
      for (var effectId in context.effects) {
        if (__DEV__) {
          assertEffectRegistrationExists(context, effectId)
        }
        var handler = getRegistration(EFFECT, effectId)
        handler(context.effects[effectId])
      }
      return context
    },
  }

  // --- Utilities -------------------------------------
  function assertEffectRegistrationExists(context, effectId) {
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

  function assertEventRegistrationExists(event) {
    if (!getRegistration(EVENT, event[0])) {
      throw new Error(
        "You dispatched an event that isn't registered with the store. " +
          'Please register "' +
          event[0] +
          '" with registerEventDB or registerEventFX.'
      )
    }
  }

  function assertValidEventShape(event) {
    if (!Array.isArray(event)) {
      throw new Error(
        'You dispatched an invalid event. An event is an array that looks like [eventId] or [eventId, payload].'
      )
    }
  }

  function snapshot() {
    var snap = {
      db: APP_DB.deref(),
      revoke: function revoke() {
        snap.db = snap.revoke = snap.restore = undefined
      },
      restore: function restore() {
        APP_DB.reset(snap.db)
      },
    }
    return snap
  }

  // --- Public API ------------------------------------
  return {
    dispatch: dispatch,
    dispatchSync: dispatchSync,
    snapshot: snapshot,
    injectCoeffect: injectCoeffect,
    registerCoeffect: registerCoeffect,
    registerEventDB: registerEventDB,
    registerEventFX: registerEventFX,
    registerEffect: registerEffect,
  }
}

import {assoc, flatten, forOwn} from './utilities.js'
import createEventQueue from './create-event-queue.js'
import {
  validateInterceptors,
  dbHandlerToInterceptor,
  fxHandlerToInterceptor,
  runInterceptors,
  switchDirections,
} from './interceptors.js'

function createStore(initialState) {
  // Reference to the current app state. This reference changes over time
  // because its value is immutable.
  var APP_DB = initialState

  // Dispatched events are inserted into this FIFO queue. The queue manages its
  // own internal scheduler for processing events.
  var EVENT_QUEUE = createEventQueue(function processEvent(event) {
    var interceptors = getRegistration(EVENT, event[0])
    var context = {
      queue: interceptors,
      stack: [],
      effects: {},
      coeffects: {
        event: event,
      },
    }
    context = runInterceptors(context, 'before')
    context = switchDirections(context)
    context = runInterceptors(context, 'after')
  })

  // --- Registrations ---------------------------------
  var EVENT = 0
  var EFFECT = 1
  var COEFFECT = 2
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
    if (arguments.length === 2) {
      handler = interceptors
      interceptors = []
    }

    if (__DEV__) {
      validateInterceptors(
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
    if (arguments.length === 2) {
      handler = interceptors
      interceptors = []
    }

    if (__DEV__) {
      validateInterceptors(
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
    if (typeof event === 'string') {
      EVENT_QUEUE.push([event, arguments[1]])
    } else {
      EVENT_QUEUE.push(event)
    }
  }

  // --- Built-in Effects ------------------------------
  registerEffect('db', function(nextDB) {
    APP_DB = nextDB
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
    return assoc(coeffects, ['db'], APP_DB)
  })

  // The `db` coeffect is used in all event handlers, so we save a single
  // reference to its interceptor as an optimization.
  var INJECT_DB = injectCoeffect('db')

  // --- Built-in Interceptors ------------------------
  var RUN_EFFECTS = {
    id: 'run-effects',
    after: function after(context) {
      forOwn(context.effects, function(id, args) {
        var effect = getRegistration(EFFECT, id)
        effect(args)
      })
      return context
    },
  }

  // --- Utilities -------------------------------------
  function snapshot() {
    var dbSnapshot = APP_DB
    var registrationsSnapshot = REGISTRATIONS
    return {
      db: dbSnapshot,
      restore: function restore() {
        APP_DB = dbSnapshot
        REGISTRATIONS = registrationsSnapshot
      },
    }
  }

  // --- Public API ------------------------------------
  return {
    dispatch: dispatch,
    snapshot: snapshot,
    registerCoeffect: registerCoeffect,
    registerEventDB: registerEventDB,
    registerEventFX: registerEventFX,
    registerEffect: registerEffect,
  }
}

export default createStore

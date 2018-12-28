import EventQueue from './event-queue.js'
import {dbHandlerToInterceptor, fxHandlerToInterceptor} from './interceptors.js'
import {flatten, forOwn, assoc, assocPath, shallowClone} from './utilities.js'

function createStore(initialState) {
  /**
   * Reference to the current app state. This reference changes over time
   * because its value is immutable.
   */
  var APP_STATE = initialState

  /**
   * Dispatched events are inserted into this FIFO queue. The queue manages its
   * own internal scheduler for processing events.
   */
  var EVENT_QUEUE = new EventQueue()

  function runInterceptors(context, direction) {
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

  // HACK: EventQueue should not be tied to the store, but it needs to access
  // the registrations and store state in order to process an event. Figure
  // out a way to abstract this.
  EVENT_QUEUE._processEvent = function _processEvent(event) {
    try {
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
      context = assoc(context, 'queue', context.stack)
      context = runInterceptors(context, 'after')
    } catch (e) {
      this._trigger('exception', e)
    }
  }

  // --- Registrations ---------------------------------
  var EVENT = 'EVENT'
  var EFFECT = 'EFFECT'
  var COEFFECT = 'COEFFECT'
  var REGISTRATIONS = {
    [EVENT]: {},
    [EFFECT]: {},
    [COEFFECT]: {},
  }

  function register(kind, id, handler) {
    REGISTRATIONS = assocPath(REGISTRATIONS, [kind, id], handler)
  }

  function getRegistration(kind, id) {
    return REGISTRATIONS[kind][id]
  }

  function registerEventDB(id, interceptors, handler) {
    if (arguments.length === 2) {
      handler = interceptors
      interceptors = []
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
      EVENT_QUEUE.push([].slice.call(arguments))
    } else {
      EVENT_QUEUE.push(event)
    }
  }

  // --- Built-in Effects ------------------------------
  registerEffect('db', function db(nextState) {
    APP_STATE = nextState
  })

  registerEffect('dispatch', function dispatch(event) {
    dispatch(event)
  })

  registerEffect('dispatchN', function dispatchN(events) {
    for (var i = 0; i < events.length; i++) {
      dispatch(events[i])
    }
  })

  /**
   * --- Coeffects -------------------------------------
   */
  function registerCoeffect(id, handler) {
    register(COEFFECT, id, handler)
  }

  function injectCoeffect(id) {
    return {
      id: 'inject-coeffect',
      before: function before(context) {
        var handler = getRegistration(COEFFECT, id)
        return assoc(context, 'coeffects', handler(context.coeffects))
      },
    }
  }

  /**
   * Inserts the current value of app state as "db" into coeffects.
   */
  registerCoeffect('db', function injectDB(coeffects) {
    return assoc(coeffects, 'db', APP_STATE)
  })

  /**
   * The `db` coeffect is used in all event handlers, so we save a single
   * reference to its interceptor as an optimization.
   */
  var INJECT_DB = injectCoeffect('db')

  // --- Built-in Interceptors ------------------------
  var RUN_EFFECTS = {
    id: 'run-effects',
    after: function(context) {
      forOwn(context.effects, function(id, args) {
        var effect = getRegistration(EFFECT, id)
        effect(args)
      })
      return context
    },
  }

  // --- Utilities -------------------------------------
  function snapshot() {
    var dbSnapshot = APP_STATE
    var registrationsSnapshot = REGISTRATIONS
    return {
      db: dbSnapshot,
      restore: function restore() {
        APP_STATE = dbSnapshot
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

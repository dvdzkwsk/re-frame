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

  // --- Registrations ---------------------------------
  var EVENT = 'EVENT'
  var EFFECT = 'EFFECT'
  var COEFFECT = 'COEFFECT'
  var REGISTRATIONS = {
    [EVENT]: {},
    [EFFECT]: {},
    [COEFFECT]: {},
  }

  /**
   * Registers an event-db, event-fx, or coeffect with the store.
   *
   * @param {'EVENT' | 'EFFECT' | 'COEFFECT'} kind - kind of handler to register
   * @param {string} id - unique id of the handler
   * @param {Array} interceptors
   */
  function register(kind, id, interceptors) {
    REGISTRATIONS = assocPath(REGISTRATIONS, [kind, id], flatten(interceptors))
  }

  /**
   * @param {'EVENT' | 'EFFECT' | 'COEFFECT'} kind - kind of handler to lookup
   * @param {string} id - unique id of the handler
   * @returns {Array} interceptors associated with this handler
   */
  function getRegistration(kind, id) {
    return REGISTRATIONS[kind][id]
  }

  function registerEventDB(id, interceptors, handler) {
    if (arguments.length === 2) {
      handler = interceptors
      interceptors = []
    }

    register(EVENT, id, [
      COFX_INJECT_DB,
      RUN_EFFECTS,
      interceptors,
      dbHandlerToInterceptor(handler),
    ])
  }

  function registerEventFX(id, interceptors, handler) {
    if (arguments.length === 2) {
      handler = interceptors
      interceptors = []
    }

    register(EVENT, id, [
      COFX_INJECT_DB,
      RUN_EFFECTS,
      interceptors,
      fxHandlerToInterceptor(handler),
    ])
  }

  function registerEffect(id, handler) {
    register(EFFECT, id, [])
  }

  function registerCoeffect(id, handler) {
    register(COEFFECT, id, handler)
  }

  // --- Dispatch -------------------------------------
  function dispatch(event) {
    EVENT_QUEUE.push(event)
  }

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

  // HACK: Don't want EventQueue tied to the store, but it needs to access the
  // registrations and store state in order to process an event. Figure out a
  // way to abstract this.
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
      context = assoc(context, 'queue', context.stack.slice().reverse)
      context = runInterceptors(context, 'after')
    } catch (e) {
      this._trigger('exception', e)
    }
  }

  // --- Built-in Interceptors ------------------------
  var RUN_EFFECTS = {
    id: 'run-effects',
    after: function(context) {
      forOwn(context.effects, function(id, args) {
        effect = getRegistration(EFFECT, id)
        effect(args)
      })
      return context
    },
  }

  // --- Built-in Coeffects ----------------------------
  var COFX_INJECT_DB = {
    id: 'inject-db',
    before: function(context) {
      return assocPath(context, ['coeffects', 'db'], APP_STATE)
    },
  }

  // --- Built-in Effects ------------------------------
  registerEffect('db', [], function db(event) {
    console.log('SET APP_STATE TO', event)
    APP_STATE = event[1]
  })

  registerEffect('dispatch', [], function dispatch(event) {
    dispatch(event)
  })

  registerEffect('dispatchN', [], function dispatchN(events) {
    for (var i = 0; i < events.length; i++) {
      dispatch(events[i])
    }
  })

  // --- Utilities -------------------------------------
  function snapshot() {
    var appStateSnapshot = APP_STATE
    var registrationsSnapshot = REGISTRATIONS
    return {
      restore: function restore() {
        APP_STATE = appStateSnapshot
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

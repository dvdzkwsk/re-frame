import EventQueue from './event-queue.js'
import {dbHandlerToInterceptor, fxHandlerToInterceptor} from './interceptors.js'
import {flatten, forOwn, assocPath} from './utilities.js'

function createStore() {
  /**
   * Reference to the current app state. This reference changes over time
   * because its value is immutable.
   */
  var APP_STATE

  /**
   * Dispatched events are inserted into this FIFO queue. The queue manages its
   * own internal scheduler for processing events.
   */
  var EVENT_QUEUE = new EventQueue()

  // --- Registrations ---------------------------------
  var EVENT = 'EVENT'
  var EFFECT = 'EFFECT'
  var COFX = 'COFX'
  var REGISTRATIONS = {
    [EVENT]: {},
    [EFFECT]: {},
    [COFX]: {},
  }

  /**
   * Registers an event-db, event-fx, or coeffect with the store.
   *
   * @param {'EVENT' | 'EFFECT' | 'COFX'} kind - kind of handler to register
   * @param {string} id - unique id of the handler
   * @param {Array} intereceptors
   */
  function register(kind, id, intereceptors) {
    REGISTRATIONS = assocPath(REGISTRATIONS, [kind, id], flatten(intereceptors))
  }

  /**
   * @param {'EVENT' | 'EFFECT' | 'COFX'} kind - kind of handler to lookup
   * @param {string} id - unique id of the handler
   * @returns {Array} interceptors associated with this handler
   */
  function getRegistration(kind, id) {
    return REGISTRATIONS[kind][id]
  }

  function registerEventDB(id, interceptors, handler) {
    register(EVENT, id, [
      COFX_INJECT_DB,
      RUN_EFFECTS,
      interceptors,
      dbHandlerToInterceptor(handler),
    ])
  }

  function registerEventFX(id, interceptors, handler) {
    register(EVENT, id, [
      COFX_INJECT_DB,
      RUN_EFFECTS,
      interceptors,
      fxHandlerToInterceptor(handler),
    ])
  }

  function registerFX(id, handler) {
    register(FX, id, [])
  }

  function registerCoeffect(id, handler) {
    register(COEFFECT, id, handler)
  }

  // --- Dispatch -------------------------------------
  function dispatch(event) {
    EVENT_QUEUE.push(event)
  }

  // --- Built-in Interceptors ------------------------
  var RUN_EFFECTS = {
    id: 'run-effects',
    after: function(context) {
      forOwn(context.effects, function(id, args) {
        effect = getRegistration(EVENT_FX, id)
        effect(args)
      })
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
  registerFX('db', [], function db(event) {
    APP_STATE = event[1]
  })

  registerFX('dispatch', [], function dispatch(event) {
    dispatch(event)
  })

  registerFX('dispatchN', [], function dispatchN(events) {
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
    registerFX: registerFX,
  }
}

export default createStore

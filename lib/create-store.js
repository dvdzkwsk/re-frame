import EventQueue from './event-queue.js'
import {dbHandlerToInterceptor, fxHandlerToInterceptor} from './interceptors.js'
import {flatten} from './utilities.js'

function createContext() {
  return {
    coeffects: {},
    effects: {},
    queue: [],
    stack: [],
  }
}

function createStore() {
  /**
   * Reference to the current app state. This reference changes over time
   * because its value is immutable.
   */
  let APP_STATE

  // --- Registrations ---------------------------------
  const EVENT_DB = 'EVENT_DB'
  const EVENT_FX = 'EVENT_FX'
  const COEFFECT = 'COEFFECT'
  let REGISTRATIONS = {
    [EVENT_DB]: {},
    [EVENT_FX]: {},
    [COEFFECT]: {},
  }

  /**
   * Registers an event-db, event-fx, or coeffect with the store.
   *
   * @param {'EVENT_DB' | 'EVENT_FX' | 'COEFFECT'} kind - kind of handler to register
   * @param {string} id - unique id of the handler
   * @param {Array} intereceptors
   */
  function register(kind, id, intereceptors) {
    REGISTRATIONS = {
      ...REGISTRATIONS,
      [kind]: {
        ...REGISTRATIONS[kind],
        [id]: flatten(intereceptors),
      },
    }
  }

  /**
   * @param {'EVENT_DB' | 'EVENT_FX' | 'COEFFECT'} kind - kind of handler to lookup
   * @param {string} id - unique id of the handler
   * @returns {Array} interceptors associated with this handler
   */
  function getRegistration(kind, id) {
    return REGISTRATIONS[kind][id]
  }

  function registerEventDB(id, interceptors, handler) {
    register(EVENT_DB, id, [
      COFX_INJECT_DB,
      DO_FX,
      interceptors,
      dbHandlerToInterceptor(handler),
    ])
  }

  function registerEventFX(id, interceptors, handler) {
    register(EVENT_DB, id, [
      COFX_INJECT_DB,
      DO_FX,
      interceptors,
      fxHandlerToInterceptor(handler),
    ])
  }

  function registerCoeffect(id, handler) {
    register(COEFFECT, id, handler)
  }

  // --- Dispatch -------------------------------------
  function dispatch(event) {}

  // --- Built-in Interceptors ------------------------
  const DO_FX = {
    id: 'do-fx',
    after(context) {
      for (const [id, value] of Object.entries(context.effects)) {
        const handler = getRegistration(EVENT_FX, id)
        if (!handler) {
          console.error(`No handler registered for effect: ${id}`)
          return
        }
        handler(value)
      }
    },
  }

  // --- Built-in Coeffects ----------------------------
  const COFX_INJECT_DB = {
    id: 'inject-db',
    before(context) {
      return {
        ...context,
        coeffects: {
          ...context.coeffects,
          db: APP_STATE,
        },
      }
    },
  }

  // --- Built-in Effects ------------------------------
  registerEventFX('db', [], value => {
    APP_STATE = value
  })

  registerEventFX('dispatch', [], ({db}, event) => {
    dispatch(event)
  })

  registerEventFX('dispatchN', [], ({db}, events) => {
    for (let i = 0; i < events.length; i++) {
      dispatch(events[i])
    }
  })

  // --- Utilities -------------------------------------
  function snapshot() {
    const appStateSnapshot = APP_STATE
    const registrationsSnapshot = REGISTRATIONS
    return {
      restore() {
        APP_STATE = appStateSnapshot
        REGISTRATIONS = registrationsSnapshot
      },
    }
  }

  // --- Public API ------------------------------------
  return {
    dispatch,
    snapshot,
    registerCoeffect,
    registerEventDB,
    registerEventFX,
  }
}

export default createStore

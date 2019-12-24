import {createStore as createBaseStore} from "@re-frame/core"

export function createStore() {
  var store = createBaseStore.apply(null, arguments)

  // Aliases
  store.event = store.registerEventDB
  store.event.fx = store.registerEventFX
  store.effect = store.registerEffect
  store.inject = store.injectCoeffect
  store.computed = store.registerSubscription

  // Ergonomic wrappers
  store.dispatch = makeSimpleDispatch(store.dispatch)
  store.dispatchSync = makeSimpleDispatch(store.dispatchSync)
  store.query = makeSimpleQuery(store.query)
  store.subscribe = makeSimpleQuery(store.subscribe)

  // New functionality
  store.init = function(initialState) {
    // TODO: verify init not called after first run?
    // TODO: how to unregister an event?
    store.registerEventDB("@re-frame/init", function init(db, event) {
      return event.initialState
    })
    store.dispatchSync({id: "@re-frame/init", initialState: initialState})
  }

  return store
}

/**
 * Store only supports subscribing with a tuple: ["id", ...args].
 * makeSimpleSubscribe allows passing these values in unwrapped:
 *
 * Before : subscribe({ id: "foo", foo: true })
 * After  : subscribe("id", { foo: true })
 */
function makeSimpleQuery(subscribe) {
  return function normalizeQuery(id, where) {
    var query
    if (typeof id === "object") {
      query = id
    } else {
      query = Object.create(null)
      query.id = id
      if (where) {
        query.where = where
      }
    }
    return subscribe(query)
  }
}

/**
 * Before : dispatch({ id: "event" })
 * After  : dispatch("event")
 *
 * Before : dispatch({ id: "event", payload: 1 })
 * After  : dispatch("event", 1)
 *
 * Before : dispatch({ id: "event", error: true, message: "error!" })
 * After  : dispatch("event", { error: true, message: "error!" })
 */
function makeSimpleDispatch(dispatcher) {
  return function dispatch(event, payload) {
    if (typeof event === "object") {
      if (Array.isArray(event)) {
        event.forEach(function(event) {
          dispatch(event)
        })
      } else {
        dispatcher(event)
      }
    } else {
      event = {id: event}
      if (payload) {
        if (typeof payload === "object") {
          for (var key in payload) {
            if (payload.hasOwnProperty(key)) {
              if (key === "id") {
                // TODO: warn in development
                continue
              }
              event[key] = payload[key]
            }
          }
        } else {
          event.payload = payload
        }
      }
      dispatcher(event)
    }
  }
}

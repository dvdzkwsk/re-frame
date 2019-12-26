export function instrument(store) {
  // TODO: need to properly flush event queue
  // TODO: should event queue be made synchronous during act?
  function act(routine) {
    var dispatch = store.dispatch
    var promise = Promise.resolve()
    store.dispatch = function() {
      promise = promise.then(function() {
        return Promise.resolve()
      })
      dispatch.apply(null, arguments)
    }
    function settle() {
      return promise
    }
    return Promise.resolve(routine()).then(settle)
  }

  act.debug = function(routine) {
    return debug(function() {
      return act(routine)
    })
  }

  function debug(routine) {
    var dispatch = store.dispatch
    var dispatchSync = store.dispatchSync
    store.dispatch = function(event, payload) {
      console.debug(
        '@re-frame: dispatch "%s"',
        typeof event === "object" ? event.id : event
      )
      dispatch(event, payload)
    }
    store.dispatchSync = function(event, payload) {
      console.debug(
        '@re-frame: dispatchSync "%s"',
        typeof event === "object" ? event.id : event
      )
      dispatchSync(event, payload)
    }
    function debugPostEventCallback(event) {
      console.debug("@re-frame: post event callback:", event)
    }
    store.registerPostEventCallback(debugPostEventCallback)
    return Promise.resolve(routine()).then(
      function() {
        store.removePostEventCallback(debugPostEventCallback)
      },
      function() {
        store.removePostEventCallback(debugPostEventCallback)
      }
    )
  }

  store.act = act
  store.debug = debug
  return store
}

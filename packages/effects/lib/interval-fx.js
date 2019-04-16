export function interval(store) {
  var ACTIVE_INTERVALS = {}

  function startInterval(config) {
    if (ACTIVE_INTERVALS[config.id]) {
      stopInterval(config)
    }

    ACTIVE_INTERVALS[config.id] = setInterval(function() {
      store.dispatch(config.dispatch)
    }, config.ms)
  }

  function stopInterval(config) {
    clearInterval(ACTIVE_INTERVALS[config.id])
  }

  return function interval(config) {
    if (!config.id) {
      throw new Error('interval-fx requires an "id" to track the interval')
    }
    switch (config.action) {
      case "start":
        startInterval(config)
        break
      case "stop":
        stopInterval(config)
        break
      default:
        throw new Error('interval-fx requires an "action" ("start" | "stop")')
    }
  }
}

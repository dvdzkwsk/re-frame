export function orchestrate(store) {
  return function(config) {
    if (!config.rules || !config.rules.length) {
      return
    }

    function halt() {
      store.removePostEventCallback(postEventCallback)
    }

    function postEventCallback(event) {
      for (var i = 0; i < config.rules.length; i++) {
        var rule = config.rules[i]
        if (rule.after !== event.id) continue

        if (rule.dispatch) {
          store.dispatch(rule.dispatch)
        }
        if (rule.dispatchN) {
          for (var j = 0; j < rule.dispatchN.length; j++) {
            store.dispatch(rule.dispatchN[j])
          }
        }
        if (rule.halt) {
          halt()
        }
      }
    }

    store.registerPostEventCallback(postEventCallback)
    if (config.dispatch) {
      store.dispatch(config.dispatch)
    }
  }
}

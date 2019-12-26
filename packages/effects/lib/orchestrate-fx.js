export function orchestrate(store) {
  return function(config) {
    function halt() {
      store.removePostEventCallback(checkOrchestrateRules)
    }

    function checkOrchestrateRules(event) {
      for (var i = 0; i < config.rules.length; i++) {
        var rule = config.rules[i]
        if (rule.after !== event.id) continue

        if (rule.dispatch) {
          store.dispatch(rule.dispatch)
        }
        if (rule.halt) {
          halt()
        }
      }
    }

    if (config.dispatch) {
      store.dispatch(config.dispatch)
    }
    if (config.rules && config.rules.length) {
      store.registerPostEventCallback(checkOrchestrateRules)
    }
  }
}

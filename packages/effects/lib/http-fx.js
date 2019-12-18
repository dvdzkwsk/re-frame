export function http(store, opts) {
  var fetch = (opts && opts.fetch) || window.fetch

  return function http(config) {
    if (Array.isArray(config)) {
      return Promise.all(config.map(http))
    }

    return fetch(config.url, config)
      .then(function(res) {
        if (!res.ok) {
          throw res
        }
        var contentType = res.headers.get("content-type")
        if (!contentType) {
          return res
        }
        if (contentType.indexOf("application/json") !== -1) {
          return res.json()
        }
        return res
      })
      .then(
        function(res) {
          // TODO: should merge with config.success if it's an object
          if (config.success) {
            store.dispatch({id: config.success, response: res})
          }
          return res
        },
        function(err) {
          // TODO: should merge with config.failure if it's an object
          if (config.failure) {
            store.dispatch({id: config.failure, error: err})
          } else {
            throw err
          }
        }
      )
  }
}

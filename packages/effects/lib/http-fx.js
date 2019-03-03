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
        var contentType = res.headers.get('content-type')
        if (!contentType) {
          return res
        }
        if (contentType.indexOf('application/json') !== -1) {
          return res.json()
        }
        return res
      })
      .then(
        function(res) {
          if (config.success) {
            store.dispatch(config.success.concat(res))
          }
          return res
        },
        function(err) {
          if (config.failure) {
            store.dispatch(config.failure.concat(err))
          } else {
            throw err
          }
        }
      )
  }
}

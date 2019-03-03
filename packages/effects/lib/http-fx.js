export function http(store, opts) {
  var fetch = (opts && opts.fetch) || window.fetch

  return function http(config) {
    if (Array.isArray(config)) {
      return config.forEach(http)
    }

    fetch(config.url, config)
      .then(function(res) {
        if (!res.ok) {
          throw res
        }
        var contentType = res.headers.get('content-type')
        switch (contentType) {
          case 'application/json':
            return res.json()
          default:
            return res
        }
      })
      .then(
        function(res) {
          if (config.success) {
            store.dispatch(config.success.concat(res))
          }
        },
        function(err) {
          if (config.failure) {
            store.dispatch(config.failure.concat(err))
          }
        }
      )
  }
}

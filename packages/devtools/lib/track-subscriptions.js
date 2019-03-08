export function trackSubscriptions(store) {
  var ACTIVE_SUBSCRIPTIONS = []

  var _subscribe = store.subscribe
  store.subscribe = function(query) {
    var subscription = _subscribe(query)
    ACTIVE_SUBSCRIPTIONS.push(subscription)

    var _dispose = subscription.dispose
    subscription.dispose = function dispose() {
      ACTIVE_SUBSCRIPTIONS.splice(ACTIVE_SUBSCRIPTIONS.indexOf(subscription), 1)
      _dispose()
    }
    return subscription
  }
  store.devtools = store.devtools || {}
  store.devtools.subscriptions = ACTIVE_SUBSCRIPTIONS
}

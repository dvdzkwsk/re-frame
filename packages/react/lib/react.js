import React from "react"

var useContext = React.useContext
var useEffect = React.useEffect
var useState = React.useState
var useRef = React.useRef

export var StoreContext = React.createContext()
export var StoreProvider = StoreContext.Provider
StoreProvider.displayName = "@re-frame/StoreProvider"

export function useStore() {
  var store = useContext(StoreContext)
  return [useSubscription, store.dispatch]
}

export function useDispatch(event) {
  var store = useContext(StoreContext)
  if (event) {
    useEffect(function() {
      store.dispatch(event)
    }, event)
  }
  return store.dispatch
}

export function useSubscription(query) {
  var store = useContext(StoreContext)

  // TODO: is this safe? We need to return a synchronous value on mount.
  // After that we're free to use "useEffect" for side effects involving
  // a live subscription. Both initialization branches are guaranteed to
  // run the same hook in the same order.
  var state
  var mounted = useRef(false)
  if (!mounted.current) {
    state = useState(store.query(query))
  } else {
    state = useState()
  }
  var value = state[0]
  var setValue = state[1]

  useEffect(function() {
    if (!mounted.current) {
      mounted.current = true
    }
    var subscription = store.subscribe(query)

    // The subscription may have emitted a new value between the start of render
    // and mount. If so, broadcast that change.
    if (value !== subscription.deref()) {
      setValue(subscription.deref())
    }
    subscription.watch(function(prev, next) {
      setValue(next)
    })
    return function() {
      subscription.dispose()
    }
  }, query)
  return value
}

export function useSubscriptions(queries) {
  var mounted = useRef(false)
  var store = useContext(StoreContext)
  var state = useState(!mounted.current && queries.map(store.query))
  var value = state[0]
  var setValue = state[1]

  useEffect(function() {
    if (!mounted.current) {
      mounted.current = true
    }

    var subscriptions = queries.map(store.subscribe)
    subscriptions.forEach(function(subscription) {
      subscription.watch(recompute)
    })

    function recompute() {
      setValue(
        subscriptions.map(function(subscription) {
          return subscription.deref()
        })
      )
    }

    return function() {
      subscriptions.forEach(function(subscription) {
        subscription.dispose()
      })
    }
  }, flatten(queries))

  return value
}

var _concat = [].concat
function flatten(arr) {
  return _concat.apply([], arr)
}

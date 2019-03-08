import React from "react"

var useContext = React.useContext
var useEffect = React.useEffect
var useState = React.useState
var useRef = React.useRef

export var StoreContext = React.createContext()
export var StoreProvider = StoreContext.Provider

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
  // a live subscription.
  var mounted = useRef(false)
  var state = useState(!mounted.current && store.query(query))
  var value = state[0]
  var setValue = state[1]

  useEffect(function() {
    if (!mounted.current) {
      mounted.current = true
    }
    // TODO: it may be possible (but unlikely) for the subscription value to
    // change between the first mount and this effect being fired. In that case
    // we would lose it since we hadn't had a chance to setup a watcher.
    // This is likely an anti-pattern... warn?
    var subscription = store.subscribe(query)
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

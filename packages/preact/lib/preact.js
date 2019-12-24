import {createContext} from "preact"
import {useContext, useEffect, useMemo, useState} from "preact/hooks"

export var StoreContext = createContext()
export var StoreProvider = StoreContext.Provider
StoreProvider.displayName = "@re-frame/StoreProvider"

export function useDispatch() {
  var store = useContext(StoreContext)
  return store.dispatch
}

export function useLazySubscription(query, params, dependencies) {
  if (arguments.length === 2) {
    dependencies = params
    params = undefined
  }

  var store = useContext(StoreContext)
  var state = useState()
  var value = state[0]
  var setValue = state[1]

  useEffect(
    function() {
      var subscription = store.subscribe(query, params)

      // The subscription may have emitted a new value between the start of render
      // and mount. If so, broadcast that change.
      if (value !== subscription.deref()) {
        setValue(subscription.deref())
      }
      subscription.watch(function(next) {
        setValue(next)
      })
      return function() {
        subscription.dispose()
      }
    },
    dependencies ? dependencies.concat(query) : [query]
  )
  return value
}

export function useSubscription(query, params, dependencies) {
  if (arguments.length === 2) {
    dependencies = params
    params = undefined
  }

  var store = useContext(StoreContext)
  var subscription = useMemo(
    function() {
      return store.subscribe(query, params)
    },
    dependencies ? dependencies.concat(query) : [query]
  )

  var state = useState(subscription.deref())
  var value = state[0]
  var setValue = state[1]

  useEffect(() => {
    if (subscription.deref() !== value) {
      setValue(subscription.deref())
    }
    subscription.watch(function(next) {
      setValue(next)
    })
    return function() {
      subscription.dispose()
    }
  }, [subscription])

  return value
}

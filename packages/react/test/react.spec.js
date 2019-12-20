import React from "react"
import TestRenderer from "react-test-renderer"
import {createStore} from "@re-frame/store"
import {
  StoreProvider,
  useDispatch,
  useSubscription,
  useLazySubscription,
} from "../lib/react"
import test from "ava"

const h = React.createElement

test("useDispatch returns the store dispatcher from context", t => {
  t.plan(1)

  const store = createStore()
  const App = () => {
    return h(StoreProvider, {value: store}, h(Child))
  }
  const Child = () => {
    const dispatch = useDispatch()
    t.is(dispatch, store.dispatch)
    return null
  }
  TestRenderer.create(h(App))
})

test("useSubscription synchronously computes the subscription's current value on first render", t => {
  t.plan(1)

  const store = createStore()
  store.init({todos: [1, 2, 3, 4]})
  store.computed("todos", db => db.todos)

  const App = () => {
    return h(StoreProvider, {value: store}, h(Child))
  }
  const Child = () => {
    const todos = useSubscription("todos")
    t.deepEqual(todos, [1, 2, 3, 4])
    return null
  }
  TestRenderer.create(h(App))
})

test("useSubscription with no dependency list only subscribes once", t => {
  let subscriptions = 0

  const store = createStore()
  const subscribe = store.subscribe
  store.subscribe = (...args) => {
    subscriptions++
    return subscribe(...args)
  }
  store.init({todos: [1, 2, 3, 4]})
  store.computed("todos", db => db.todos)

  const App = () => {
    return h(StoreProvider, {value: store}, h(Child))
  }
  const Child = () => {
    useSubscription("todos")
    return null
  }

  // Render once to setup subscription
  let renderer
  TestRenderer.act(() => {
    renderer = TestRenderer.create(h(App))
  })
  t.is(subscriptions, 1)

  // Render again, useSubscription should reuse previous subscription
  TestRenderer.act(() => {
    renderer.update()
  })
  t.is(subscriptions, 1)
})

test("useSubscription with a dependency list only resubscribes when those dependencies change", t => {
  let subscriptions = 0
  let dependencies = [1]

  const store = createStore()
  const subscribe = store.subscribe
  store.subscribe = (...args) => {
    subscriptions++
    return subscribe(...args)
  }
  store.init({todos: [1, 2, 3, 4]})
  store.computed("todos", db => db.todos)

  const App = () => {
    return h(StoreProvider, {value: store}, h(Child))
  }
  const Child = () => {
    useSubscription("todos", dependencies)
    return null
  }

  // Render once to setup subscription
  let renderer
  TestRenderer.act(() => {
    renderer = TestRenderer.create(h(App))
  })
  t.is(subscriptions, 1)

  // Render again with new dependencies; subscription should be recreated.
  dependencies = [2]
  TestRenderer.act(() => {
    renderer.update(h(App))
  })
  t.is(subscriptions, 2)

  // Reuse previous dependencies, should reuse subscription
  TestRenderer.act(() => {
    renderer.update(h(App))
  })
  t.is(subscriptions, 2)
})

test("useLazySubscription does not compute the subscription until after the component is mounted", async t => {
  let renders = 0
  const store = createStore()
  store.init({value: "something"})
  store.computed("test", db => db.value)

  const App = () => {
    return h(StoreProvider, {value: store}, h(Child))
  }
  const Child = () => {
    const value = useLazySubscription("test")
    if (renders === 0) {
      t.is(value, undefined)
    }
    if (renders === 1) {
      t.is(value, "something")
    }
    renders++
    return null
  }

  let renderer
  TestRenderer.act(() => {
    renderer = TestRenderer.create(h(App))
  })

  TestRenderer.act(() => {
    renderer.update(h(App))
  })
})

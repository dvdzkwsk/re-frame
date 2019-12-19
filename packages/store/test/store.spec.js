import test from "ava"
import {createStore} from "../lib/store.js"

process.env.NODE_ENV = "development"

async function flush() {
  await Promise.resolve() // let dispatch run
  await new Promise(resolve => setTimeout(resolve)) // let subscriptions run
}

function createStoreWithState(state) {
  const store = createStore()
  store.registerEventDB("__init__", () => state)
  store.dispatchSync({id: "__init__"})
  return store
}

test("runtime checks are only enabled in development mode", t => {
  const invalidInterceptors = [null]

  // validation should be enabled in development
  process.env.NODE_ENV = "development"
  t.throws(() => {
    const store = createStore()
    store.registerEventDB("foo", invalidInterceptors, () => {})
  })

  // validation should be skipped in production
  process.env.NODE_ENV = "production"
  t.notThrows(() => {
    const store = createStore()
    store.registerEventDB("foo", invalidInterceptors, () => {})
  })

  process.env.NODE_ENV = "development"
})

test("throws if a dispatched event type hasn't been registered with the store", t => {
  const store = createStoreWithState(0)
  t.throws(() => {
    store.dispatchSync({id: "unregistered"})
  }, 'You dispatched an event that isn\'t registered with the store. Please register "unregistered" with store.registerEventDB() or store.registerEventFX().')
})

test("dispatch > EventDB handler updates DB state", async t => {
  const store = createStoreWithState(1)
  store.registerEventDB("double", db => db * 2)
  store.registerSubscription("db", db => db)

  store.dispatch({id: "double"})
  await flush()
  t.is(store.query(["db"]), 2)

  store.dispatch({id: "double"})
  await flush()
  t.is(store.query(["db"]), 4)

  store.dispatch({id: "double"})
  await flush()
  t.is(store.query(["db"]), 8)
})

test("dispatch > throws if called with an unwrapped string", async t => {
  const store = createStoreWithState(0)
  t.throws(() => {
    store.dispatch("increment")
  }, 'You dispatched an invalid event. An event is an object that has an "id" key.')
})

test("dispatch > does not process the event immediately", async t => {
  const processedEvents = []
  const store = createStore()
  store.registerEventDB("a", (db, event) => processedEvents.push(event))

  store.dispatch({id: "a"})
  t.deepEqual(processedEvents, [])
  await flush()
  t.deepEqual(processedEvents, [{id: "a"}])
})

test("dispatch > processes events dispatched in the same loop as batch", async t => {
  const processedEvents = []
  const store = createStore()
  store.registerEventDB("a", (db, event) => processedEvents.push(event))
  store.registerEventDB("b", (db, event) => processedEvents.push(event))
  store.registerEventDB("c", (db, event) => processedEvents.push(event))

  store.dispatch({id: "a"})
  store.dispatch({id: "b"})
  store.dispatch({id: "c"})
  t.deepEqual(processedEvents, [])

  await flush()
  t.deepEqual(processedEvents, [{id: "a"}, {id: "b"}, {id: "c"}])
})

test("dispatch > processes events in the order they are dispatched", async t => {
  const processedEvents = []
  const store = createStore()
  store.registerEventDB("a", (db, event) => processedEvents.push(event))
  store.registerEventDB("b", (db, event) => processedEvents.push(event))
  store.registerEventDB("c", (db, event) => processedEvents.push(event))

  store.dispatch({id: "a"})
  store.dispatch({id: "b"})
  store.dispatch({id: "c"})

  await flush()

  t.deepEqual(processedEvents, [{id: "a"}, {id: "b"}, {id: "c"}])
})

test("dispatchSync > processes an event synchronously", t => {
  const processedEvents = []
  const store = createStore()
  store.registerEventDB("a", (db, event) => processedEvents.push(event))
  store.dispatchSync({id: "a"})
  t.deepEqual(processedEvents, [{id: "a"}])
})

test("dispatchSync > processes an event ahead of the existing queue", async t => {
  const processedEvents = []
  const store = createStore()
  store.registerEventDB("async", (db, event) => processedEvents.push(event))
  store.registerEventDB("sync", (db, event) => processedEvents.push(event))

  store.dispatch({id: "async"})
  store.dispatch({id: "async"})
  store.dispatch({id: "async"})
  store.dispatchSync({id: "sync"})

  t.deepEqual(processedEvents, [{id: "sync"}])
  await flush()
  t.deepEqual(processedEvents, [
    {id: "sync"},
    {id: "async"},
    {id: "async"},
    {id: "async"},
  ])
})

test("EventFX > throws if a requested event has not been registered", t => {
  const store = createStore()
  store.registerEventFX("test", () => ({
    effectThatDoesntExist: true,
  }))

  t.throws(() => {
    store.dispatchSync({id: "test"})
  }, 'The EventFX handler "test" attempted to create an effect "effectThatDoesntExist", but that effect has not been registered.')
})

test("EventFX > warns, but does not throw if no effects were returned", t => {
  t.plan(2)
  const store = createStore()
  const warn = console.warn
  console.warn = msg => {
    t.is(
      msg,
      'EventFX "bad-event-fx" did not return any effects, which is likely a mistake. To signal that you do not want to run any effects, return an empty object: {}.'
    )
  }

  store.registerEventFX("bad-event-fx", () => {})
  t.notThrows(() => {
    store.dispatchSync({id: "bad-event-fx"})
  })
  console.warn = warn
})

test("subscribe > throws if the target subscription has not been registered", t => {
  const store = createStore()
  t.throws(() => {
    store.subscribe(["unregistered"])
  }, 'You attempted to subscribe to "unregistered", but no subscription has been registered with that id.')
})

test("subscribe > returns an atom with the current computed value for the subscription", t => {
  const store = createStoreWithState({
    todos: ["foo", "bar", "baz"],
  })
  store.registerSubscription("todos", (db, query) => {
    return db.todos
  })
  const todos = store.subscribe(["todos"])
  t.deepEqual(todos.deref(), ["foo", "bar", "baz"])
  todos.dispose()
})

test("subscribe > provides the query vector to the subscription handler", async t => {
  const store = createStoreWithState({
    todos: [],
  })
  store.registerEventDB("add-todo", (db, event) => ({
    ...db,
    todos: db.todos.concat(event.todo),
  }))
  store.registerSubscription("todos", (db, query) => {
    return db.todos.filter(todo => todo.includes(query[1]))
  })
  const todos = store.subscribe(["todos", "baz"]) // look for todos that match "baz"
  t.deepEqual(todos.deref(), [])

  store.dispatch({id: "add-todo", todo: "foo"})
  await flush()
  t.deepEqual(todos.deref(), [])

  store.dispatch({id: "add-todo", todo: "bar"})
  await flush()
  t.deepEqual(todos.deref(), [])

  store.dispatch({id: "add-todo", todo: "baz"})
  await flush()
  t.deepEqual(todos.deref(), ["baz"])

  todos.dispose()
})

test("subscribe > recomputes the value in the computed atom whenever the store changes", async t => {
  const store = createStoreWithState({
    todos: [],
  })
  store.registerEventDB("add-todo", (db, event) => ({
    ...db,
    todos: db.todos.concat(event.todo),
  }))
  store.registerSubscription("todos", (db, query) => {
    return db.todos
  })
  const todos = store.subscribe(["todos"])
  t.deepEqual(todos.deref(), [])

  store.dispatch({id: "add-todo", todo: "foo"})
  await flush()
  t.deepEqual(todos.deref(), ["foo"])

  store.dispatch({id: "add-todo", todo: "bar"})
  await flush()
  t.deepEqual(todos.deref(), ["foo", "bar"])

  store.dispatch({id: "add-todo", todo: "baz"})
  await flush()
  t.deepEqual(todos.deref(), ["foo", "bar", "baz"])

  todos.dispose()
})

test("registerPostEventCallback > callback is called after an event is processed", t => {
  t.plan(1)
  const store = createStore()
  store.registerEventDB("noop", () => {})
  store.registerPostEventCallback(event => {
    t.deepEqual(event, {id: "noop"})
  })
  store.dispatchSync({id: "noop"})
})

test("removePostEventCallback > removes the callback from the registry", t => {
  const store = createStore()
  const callback = event => t.fail()

  store.registerEventDB("noop", () => {})
  store.registerPostEventCallback(callback)
  store.removePostEventCallback(callback)
  store.dispatchSync({id: "noop"})
  t.pass()
})

test("Can execute a one-time query without setting up a subscription", t => {
  const store = createStoreWithState({count: 5})
  store.registerSubscription("count", db => db.count)
  t.is(store.query(["count"]), 5)
})

test("Can register and execute custom effects", t => {
  t.plan(2)

  const store = createStore()
  store.registerEventFX("test-effects", (cofx, event) => ({
    http: {url: "/test-url"},
    wait: {ms: 5000, dispatch: {id: "delayed"}},
  }))
  store.registerEffect("http", store => config => {
    t.deepEqual(config, {url: "/test-url"})
  })
  store.registerEffect("wait", store => config => {
    t.deepEqual(config, {ms: 5000, dispatch: {id: "delayed"}})
  })
  store.dispatchSync({id: "test-effects"})
})

test("Custom effect factories receive the store", t => {
  t.plan(1)

  const store = createStore()
  store.registerEventFX("test-effects", (cofx, event) => ({
    http: {url: "/test-url"},
  }))
  store.registerEffect("http", _store => {
    t.is(_store, store)
    return () => {}
  })
  store.dispatchSync({id: "test-effects"})
})

test("Subscriptions are notified after postEventCallbacks are called", t => {
  let callOrder = []

  const store = createStore()
  store.registerEventDB("boot", () => 1)
  store.registerSubscription("subscription", () => 1)
  store.registerPostEventCallback(() => {
    callOrder.push("post-event-callback")
  })

  const sub = store.subscribe(["subscription"])
  sub.watch(() => {
    callOrder.push("subscription-notified")
  })
  store.dispatchSync({id: "boot"})
  sub.dispose()

  t.deepEqual(callOrder, ["post-event-callback", "subscription-notified"])
})

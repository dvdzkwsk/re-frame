import test from "ava"
import {createStore} from "../lib/store.js"

process.env.NODE_ENV === "development"
global.requestAnimationFrame = fn => setTimeout(fn)

async function flush() {
  await Promise.resolve() // let dispatch run
  await new Promise(resolve => setTimeout(resolve)) // let subscriptions run
}

function createStoreWithState(state, opts) {
  const store = createStore(opts)
  store.event("init", () => state)
  store.dispatchSync(["init"])
  return store
}

test("runtime checks are only enabled in development mode", t => {
  // dev store should throw validation errors
  process.env.NODE_ENV = "development"
  t.throws(() => {
    const store = createStore()
    store.event("foo", [null], () => {})
  }, /Invalid interceptor provided/)

  // prod store should skip validation
  process.env.NODE_ENV = "production"
  t.notThrows(() => {
    const store = createStore()
    store.event("foo", [null], () => {})
  })

  process.env.NODE_ENV = "development"
})

test("throws if a dispatched event type hasn't been registered with the store", t => {
  const store = createStoreWithState(0)
  t.throws(() => {
    store.dispatchSync(["unregistered"])
  }, 'You dispatched an event that isn\'t registered with the store. Please register "unregistered" with store.event() or store.event.fx().')
})

test("dispatch > EventDB handler updates DB state", async t => {
  const store = createStoreWithState(1)
  store.event("double", db => db * 2)
  const value = store.computed("db", db => db)

  store.dispatch(["double"])
  await flush()
  t.is(store.query(["db"]), 2)

  store.dispatch(["double"])
  await flush()
  t.is(store.query(["db"]), 4)

  store.dispatch(["double"])
  await flush()
  t.is(store.query(["db"]), 8)
})

test("dispatch > throws if called with an unwrapped string", async t => {
  const store = createStoreWithState(0)
  t.throws(() => {
    store.dispatch("increment")
  }, "You dispatched an invalid event. An event is an array that looks like [id] or [id, payload].")
})

test("dispatch > does not process the event immediately", async t => {
  const processedEvents = []
  const store = createStore()
  store.event("a", (db, event) => processedEvents.push(event))

  store.dispatch(["a"])
  t.deepEqual(processedEvents, [])
  await flush()
  t.deepEqual(processedEvents, [["a"]])
})

test("dispatch > processes events dispatched in the same loop as batch", async t => {
  const processedEvents = []
  const store = createStore()
  store.event("a", (db, event) => processedEvents.push(event))
  store.event("b", (db, event) => processedEvents.push(event))
  store.event("c", (db, event) => processedEvents.push(event))

  store.dispatch(["a"])
  store.dispatch(["b"])
  store.dispatch(["c"])
  t.deepEqual(processedEvents, [])

  await flush()
  t.deepEqual(processedEvents, [["a"], ["b"], ["c"]])
})

test("dispatch > processes events in the order they are dispatched", async t => {
  const processedEvents = []
  const store = createStore()
  store.event("a", (db, event) => processedEvents.push(event))
  store.event("b", (db, event) => processedEvents.push(event))
  store.event("c", (db, event) => processedEvents.push(event))

  store.dispatch(["a"])
  store.dispatch(["b"])
  store.dispatch(["c"])

  await flush()

  t.deepEqual(processedEvents, [["a"], ["b"], ["c"]])
})

test("dispatchSync > processes an event synchronously", t => {
  const processedEvents = []
  const store = createStore()
  store.event("a", (db, event) => processedEvents.push(event))
  store.dispatchSync(["a"])
  t.deepEqual(processedEvents, [["a"]])
})

test("dispatchSync > processes an event ahead of the existing queue", async t => {
  const processedEvents = []
  const store = createStore()
  store.event("async", (db, event) => processedEvents.push(event))
  store.event("sync", (db, event) => processedEvents.push(event))

  store.dispatch(["async"])
  store.dispatch(["async"])
  store.dispatch(["async"])
  store.dispatchSync(["sync"])

  t.deepEqual(processedEvents, [["sync"]])
  await flush()
  t.deepEqual(processedEvents, [["sync"], ["async"], ["async"], ["async"]])
})

test("EventFX > throws if a requested event has not been registered", t => {
  const store = createStore()
  store.event.fx("create_effect", () => ({
    effectThatDoesntExist: true,
  }))

  t.throws(() => {
    store.dispatchSync(["create_effect"])
  }, 'The EventFX handler "create_effect" attempted to create an effect "effectThatDoesntExist", but that effect has not been registered.')
})

test("EventFX > does not throw if no effects were returned", t => {
  const store = createStore()
  const warn = console.warn
  const warnings = []
  console.warn = msg => warnings.push(msg)

  store.event.fx("event-fx", () => {})
  t.notThrows(() => {
    store.dispatchSync(["event-fx"])
  })
  t.is(
    warnings[0],
    'EventFX "event-fx" did not return any effects, which is likely a mistake. To signal that you do not want to run any effects, return an empty object: {}.'
  )
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
  store.computed("todos", (db, query) => {
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
  store.event("add-todo", (db, event) => ({
    ...db,
    todos: db.todos.concat(event[1]),
  }))
  store.computed("todos", (db, query) => {
    return db.todos.filter(todo => todo.includes(query[1]))
  })
  const todos = store.subscribe(["todos", "baz"]) // look for todos that match "baz"
  t.deepEqual(todos.deref(), [])

  store.dispatch(["add-todo", "foo"])
  await flush()
  t.deepEqual(todos.deref(), [])

  store.dispatch(["add-todo", "bar"])
  await flush()
  t.deepEqual(todos.deref(), [])

  store.dispatch(["add-todo", "baz"])
  await flush()
  t.deepEqual(todos.deref(), ["baz"])

  todos.dispose()
})

test("subscribe > recomputes the value in the computed atom whenever the store changes", async t => {
  const store = createStoreWithState({
    todos: [],
  })
  store.event("add-todo", (db, event) => ({
    ...db,
    todos: db.todos.concat(event[1]),
  }))
  store.computed("todos", (db, query) => {
    return db.todos
  })
  const todos = store.subscribe(["todos"])
  t.deepEqual(todos.deref(), [])

  store.dispatch(["add-todo", "foo"])
  await flush()
  t.deepEqual(todos.deref(), ["foo"])

  store.dispatch(["add-todo", "bar"])
  await flush()
  t.deepEqual(todos.deref(), ["foo", "bar"])

  store.dispatch(["add-todo", "baz"])
  await flush()
  t.deepEqual(todos.deref(), ["foo", "bar", "baz"])

  todos.dispose()
})

test("addPostEventCallback > callback is called after an event is processed", t => {
  t.plan(1)
  const store = createStore()
  store.event("noop", () => {})
  store.addPostEventCallback(event => {
    t.deepEqual(event, ["noop", "foobar"])
  })
  store.dispatchSync(["noop", "foobar"])
})

test("removePostEventCallback > removes the callback from the registry", t => {
  const store = createStore()
  const callback = event => t.fail()

  store.event("noop", () => {})
  store.addPostEventCallback(callback)
  store.removePostEventCallback(callback)
  store.dispatchSync(["noop", "foobar"])
  t.pass()
})

test("Can execute a one-time query without setting up a subscription", t => {
  const store = createStoreWithState({count: 5})
  store.computed("count", db => db.count)
  t.is(store.query(["count"]), 5)
})

test("Can register and execute custom effects", t => {
  t.plan(2)

  const store = createStore()
  store.event.fx("test-effects", (cofx, event) => ({
    http: {url: "/test-url"},
    wait: {ms: 5000, dispatch: ["delayed"]},
  }))
  store.effect("http", store => config => {
    t.deepEqual(config, {url: "/test-url"})
  })
  store.effect("wait", store => config => {
    t.deepEqual(config, {ms: 5000, dispatch: ["delayed"]})
  })
  store.dispatchSync(["test-effects"])
})

test("Custom effect factories receive the store", t => {
  t.plan(1)

  const store = createStore()
  store.event.fx("test-effects", (cofx, event) => ({
    http: {url: "/test-url"},
  }))
  store.effect("http", _store => {
    t.is(_store, store)
    return () => {}
  })
  store.dispatchSync(["test-effects"])
})

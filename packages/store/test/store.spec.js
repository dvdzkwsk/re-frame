import test from "ava"
import {createStore} from "../lib/store.js"

const flush = () => new Promise(resolve => setTimeout(resolve))

test("createStore returns a store", t => {
  const store = createStore()
  t.is(typeof store, "object")
})

test('adds "init(initialState)" API to seed store', t => {
  const store = createStore()
  store.init({todos: [1, 2, 3]})
  store.computed("db", db => db)
  t.deepEqual(store.query({id: "db"}), {todos: [1, 2, 3]})
})

test('casts dispatch("event") to { id: "event" }', t => {
  t.plan(1)
  const store = createStore()
  store.event("event", () => null)
  store.registerPostEventCallback(event => {
    t.deepEqual(event, {id: "event"})
  })
  store.dispatchSync("event")
})

test('supports dispatch({ id: "event" })', t => {
  t.plan(1)
  const store = createStore()
  store.event("event", () => null)
  store.registerPostEventCallback(event => {
    t.deepEqual(event, {id: "event"})
  })
  store.dispatchSync({id: "event"})
})

test('casts dispatch("event", 1) to { id: "event", payload: 1 }', t => {
  t.plan(1)
  const store = createStore()
  store.event("event", () => null)
  store.registerPostEventCallback(event => {
    t.deepEqual(event, {id: "event", payload: 1})
  })
  store.dispatchSync("event", 1)
})

test('casts dispatch("event", { foo: "bar" }) to { id: "event", foo: "bar" }', t => {
  t.plan(1)
  const store = createStore()
  store.event("event", () => null)
  store.registerPostEventCallback(event => {
    t.deepEqual(event, {id: "event", foo: "bar"})
  })
  store.dispatchSync("event", {foo: "bar"})
})

test("supports dispatching multiple events", async t => {
  const store = createStore()
  const events = []
  store.registerPostEventCallback(event => events.push(event))
  store.event("test", () => null)
  store.dispatch(["test", "test", "test", "test"])
  await flush()
  t.deepEqual(events, ["test", "test", "test", "test"])
})

test("supports dispatching multiple events synchronously", t => {
  const store = createStore()
  const events = []
  store.registerPostEventCallback(event => events.push(event))
  store.event("test", () => null)
  store.dispatchSync(["test", "test", "test", "test"])
  t.deepEqual(events, ["test", "test", "test", "test"])
})

test('supports query("query")', t => {
  const store = createStore()
  store.init({
    todos: [1, 2, 3],
  })
  store.computed("todos", db => db.todos)
  t.deepEqual(store.query("todos"), [1, 2, 3])
})

test('supports query("query", arg1)', t => {
  const store = createStore()
  store.init({
    todos: [
      {id: 1, description: "Todo #1"},
      {id: 2, description: "Todo #2"},
    ],
  })
  store.computed("todo", (db, {where}) =>
    db.todos.find(todo => todo.id === where.id)
  )
  t.deepEqual(store.query("todo", {id: 1}), {id: 1, description: "Todo #1"})
})

test('supports subscribe("sub")', t => {
  const store = createStore()
  store.init({
    todos: [1, 2, 3],
  })
  store.computed("todos", db => db.todos)
  const sub = store.subscribe("todos")
  t.deepEqual(sub.deref(), [1, 2, 3])
  sub.dispose()
})

test('supports subscribe("sub", arg1)', t => {
  const store = createStore()
  store.init({
    todos: [
      {id: 1, description: "Todo #1"},
      {id: 2, description: "Todo #2"},
    ],
  })
  store.computed("todo", (db, {where}) =>
    db.todos.find(todo => todo.id === where.id)
  )
  const sub = store.subscribe("todo", {id: 1})
  t.deepEqual(sub.deref(), {id: 1, description: "Todo #1"})
  sub.dispose()
})

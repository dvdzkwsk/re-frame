import test from "ava"
import {createStore} from "../lib/simple-store.js"

test("createStore returns a store", t => {
  const store = createStore()
  t.is(typeof store, "object")
})

test('adds "init(initialState)" API to seed store', t => {
  const store = createStore()
  store.init({todos: [1, 2, 3]})
  store.computed("db", db => db)
  t.deepEqual(store.query(["db"]), {todos: [1, 2, 3]})
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
  store.computed("todo", (db, id) => db.todos.find(todo => todo.id === id))
  t.deepEqual(store.query("todo", 1), {id: 1, description: "Todo #1"})
})

test('supports query("query", ...args)', t => {
  const store = createStore()
  store.init({
    todos: [
      {id: 1, description: "Todo #1"},
      {id: 2, description: "Todo #2"},
      {id: 3, description: "Todo #3"},
      {id: 4, description: "Todo #4"},
    ],
  })
  store.computed("todos", (db, ...ids) => {
    return db.todos.filter(todo => ids.includes(todo.id))
  })
  t.deepEqual(store.query("todos", 2, 4), [
    {id: 2, description: "Todo #2"},
    {id: 4, description: "Todo #4"},
  ])
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
  store.computed("todo", (db, id) => db.todos.find(todo => todo.id === id))
  const sub = store.subscribe("todo", 1)
  t.deepEqual(sub.deref(), {id: 1, description: "Todo #1"})
  sub.dispose()
})

test('supports subscribe("sub", ...args)', t => {
  const store = createStore()
  store.init({
    todos: [
      {id: 1, description: "Todo #1"},
      {id: 2, description: "Todo #2"},
      {id: 3, description: "Todo #3"},
      {id: 4, description: "Todo #4"},
    ],
  })
  store.computed("todos", (db, ...ids) =>
    db.todos.filter(todo => ids.includes(todo.id))
  )
  const sub = store.subscribe("todos", 2, 4)
  t.deepEqual(sub.deref(), [
    {id: 2, description: "Todo #2"},
    {id: 4, description: "Todo #4"},
  ])
  sub.dispose()
})

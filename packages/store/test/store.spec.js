import test from 'ava'
import * as reframe from '../lib/store.js'

function processDispatchedEvents() {
  return new Promise(resolve => setTimeout(resolve))
}

// Switch to development mode for these tests because we want to test
// errors and warnings that are disabled in production builds.
test.beforeEach(() => {
  process.env.NODE_ENV = 'development'
})
test.afterEach(() => {
  process.env.NODE_ENV = 'test'
})

test('accepts an optional initial state', t => {
  const initialState = {foo: 'bar'}
  const store = reframe.createStore(initialState)

  store.registerSubscription('db', db => db)
  const db = store.subscribe(['db'])
  t.deepEqual(db.deref(), {foo: 'bar'})
  db._dispose()
})

test('Can be de-referenced', t => {
  const store = reframe.createStore({
    todos: [],
  })
  t.deepEqual(store.deref(), {
    todos: [],
  })
})

test("throws if a dispatched event type hasn't been registered with the store", t => {
  const store = reframe.createStore(0)
  t.throws(() => {
    store.dispatchSync(['unregistered'])
  }, 'You dispatched an event that isn\'t registered with the store. Please register "unregistered" with registerEventDB or registerEventFX.')
})

test('dispatch > EventDB handler updates DB state', async t => {
  const store = reframe.createStore(1)
  store.registerSubscription('db', db => db)
  const db = store.subscribe(['db'])

  store.registerEventDB('double', db => db * 2)

  store.dispatch(['double'])
  await processDispatchedEvents()
  t.is(db.deref(), 2)

  store.dispatch(['double'])
  await processDispatchedEvents()
  t.is(db.deref(), 4)

  store.dispatch(['double'])
  await processDispatchedEvents()
  t.is(db.deref(), 8)

  db._dispose()
})

test('dispatch > throws if called with an unwrapped string', async t => {
  const store = reframe.createStore(0)
  t.throws(() => {
    store.dispatch('increment')
  }, 'You dispatched an invalid event. An event is an array that looks like [id] or [id, payload].')
})

test('dispatch > does not process the event immediately', async t => {
  const processedEvents = []
  const store = reframe.createStore()
  store.registerEventDB('a', (db, event) => processedEvents.push(event))

  store.dispatch(['a'])
  t.deepEqual(processedEvents, [])
  await processDispatchedEvents()
  t.deepEqual(processedEvents, [['a']])
})

test('dispatch > processes events dispatched in the same loop as batch', async t => {
  const processedEvents = []
  const store = reframe.createStore()
  store.registerEventDB('a', (db, event) => processedEvents.push(event))
  store.registerEventDB('b', (db, event) => processedEvents.push(event))
  store.registerEventDB('c', (db, event) => processedEvents.push(event))

  store.dispatch(['a'])
  store.dispatch(['b'])
  store.dispatch(['c'])
  t.deepEqual(processedEvents, [])

  await processDispatchedEvents()
  t.deepEqual(processedEvents, [['a'], ['b'], ['c']])
})

test('dispatch > processes events in the order they are dispatched', async t => {
  const processedEvents = []
  const store = reframe.createStore()
  store.registerEventDB('a', (db, event) => processedEvents.push(event))
  store.registerEventDB('b', (db, event) => processedEvents.push(event))
  store.registerEventDB('c', (db, event) => processedEvents.push(event))

  store.dispatch(['a'])
  store.dispatch(['b'])
  store.dispatch(['c'])

  await processDispatchedEvents()

  t.deepEqual(processedEvents, [['a'], ['b'], ['c']])
})

test('dispatchSync > processes an event synchronously', t => {
  const processedEvents = []
  const store = reframe.createStore()
  store.registerEventDB('a', (db, event) => processedEvents.push(event))
  store.dispatchSync(['a'])
  t.deepEqual(processedEvents, [['a']])
})

test('dispatchSync > processes an event ahead of the existing queue', async t => {
  const processedEvents = []
  const store = reframe.createStore()
  store.registerEventDB('async', (db, event) => processedEvents.push(event))
  store.registerEventDB('sync', (db, event) => processedEvents.push(event))

  store.dispatch(['async'])
  store.dispatch(['async'])
  store.dispatch(['async'])
  store.dispatchSync(['sync'])

  t.deepEqual(processedEvents, [['sync']])
  await processDispatchedEvents()
  t.deepEqual(processedEvents, [['sync'], ['async'], ['async'], ['async']])
})

test('EventFX > throws if a requested event has not been registered', t => {
  const store = reframe.createStore()
  store.registerEventFX('create_effect', () => ({
    effectThatDoesntExist: true,
  }))

  t.throws(() => {
    store.dispatchSync(['create_effect'])
  }, 'The EventFX handler "create_effect" attempted to create an effect "effectThatDoesntExist", but that effect has not been registered.')
})

test('subscribe > throws if the target subscription has not been registered', t => {
  const store = reframe.createStore()
  t.throws(() => {
    store.subscribe(['unregistered'])
  }, 'You attempted to subscribe to "unregistered", but no subscription has been registered with that id.')
})

test('subscribe > returns an atom with the current computed value for the subscription', t => {
  const store = reframe.createStore({
    todos: ['foo', 'bar', 'baz'],
  })
  store.registerSubscription('todos', (db, query) => {
    return db.todos
  })
  const todos = store.subscribe(['todos'])
  t.deepEqual(todos.deref(), ['foo', 'bar', 'baz'])
  todos._dispose()
})

test('subscribe > provides the query vector to the subscription handler', t => {
  const store = reframe.createStore({
    todos: [],
  })
  store.registerEventDB('add-todo', (db, event) => ({
    ...db,
    todos: db.todos.concat(event[1]),
  }))
  store.registerSubscription('todos', (db, query) => {
    return db.todos.filter(todo => todo.includes(query[1]))
  })
  const todos = store.subscribe(['todos', 'baz']) // look for todos that match "baz"
  t.deepEqual(todos.deref(), [])

  store.dispatchSync(['add-todo', 'foo'])
  t.deepEqual(todos.deref(), [])

  store.dispatchSync(['add-todo', 'bar'])
  t.deepEqual(todos.deref(), [])

  store.dispatchSync(['add-todo', 'baz'])
  t.deepEqual(todos.deref(), ['baz'])

  todos._dispose()
})

test('subscribe > recomputes the value in the computed atom whenever the store changes', t => {
  const store = reframe.createStore({
    todos: [],
  })
  store.registerEventDB('add-todo', (db, event) => ({
    ...db,
    todos: db.todos.concat(event[1]),
  }))
  store.registerSubscription('todos', (db, query) => {
    return db.todos
  })
  const todos = store.subscribe(['todos'])
  t.deepEqual(todos.deref(), [])

  store.dispatchSync(['add-todo', 'foo'])
  t.deepEqual(todos.deref(), ['foo'])

  store.dispatchSync(['add-todo', 'bar'])
  t.deepEqual(todos.deref(), ['foo', 'bar'])

  store.dispatchSync(['add-todo', 'baz'])
  t.deepEqual(todos.deref(), ['foo', 'bar', 'baz'])

  todos._dispose()
})

test('addPostEventCallback > callback is called after an event is processed', t => {
  t.plan(1)
  const store = reframe.createStore()
  store.registerEventDB('noop', () => {})
  store.addPostEventCallback(event => {
    t.deepEqual(event, ['noop', 'foobar'])
  })
  store.dispatchSync(['noop', 'foobar'])
})

test('removePostEventCallback > removes the callback from the registry', t => {
  const store = reframe.createStore()
  const callback = event => t.fail()

  store.registerEventDB('noop', () => {})
  store.addPostEventCallback(callback)
  store.removePostEventCallback(callback)
  store.dispatchSync(['noop', 'foobar'])
  t.pass()
})

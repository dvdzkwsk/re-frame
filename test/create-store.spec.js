import test from 'ava'
import * as reframe from '../lib/index.js'

function processDispatchedEvents() {
  return new Promise(resolve => setTimeout(resolve))
}

test('accepts an optional initial state', t => {
  const initialState = {foo: 'bar'}
  const store = reframe.createStore(initialState)
  t.is(store.snapshot().db, initialState)
})

test('dispatch > EventDB handler updates DB state', async t => {
  const store = reframe.createStore(1)
  store.registerEventDB('double', db => db * 2)

  store.dispatch(['double'])
  await processDispatchedEvents()
  t.is(store.snapshot().db, 2)

  store.dispatch(['double'])
  await processDispatchedEvents()
  t.is(store.snapshot().db, 4)

  store.dispatch(['double'])
  await processDispatchedEvents()
  t.is(store.snapshot().db, 8)
})

test('dispatch > throws if called with an unwrapped string', async t => {
  const store = reframe.createStore(0)
  t.throws(() => {
    store.dispatch('increment')
  }, 'You dispatched an invalid event. An event is an array that looks like [eventId] or [eventId, payload].')
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

test('snapshot > returns an object containing the current state', async t => {
  const store = reframe.createStore(0)
  store.registerEventDB('increment', db => db + 1)

  store.dispatch(['increment'])
  store.dispatch(['increment'])
  store.dispatch(['increment'])
  await processDispatchedEvents()
  const snapshot = store.snapshot() // should be 3

  store.dispatch(['increment'])
  store.dispatch(['increment'])
  store.dispatch(['increment'])
  await processDispatchedEvents()

  t.is(snapshot.db, 3)
  t.is(store.snapshot().db, 6)
})

test('snapshot > can restore store to snapshotted state', async t => {
  const store = reframe.createStore(0)
  store.registerEventDB('increment', db => db + 1)
  const snapshot = store.snapshot()

  store.dispatch(['increment'])
  store.dispatch(['increment'])
  store.dispatch(['increment'])
  await processDispatchedEvents()

  t.is(store.snapshot().db, 3)
  snapshot.restore()
  t.is(store.snapshot().db, 0)
})

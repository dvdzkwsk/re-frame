import test from 'ava'
import * as reframe from '../lib/index.js'

function flush() {
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
  await flush()
  t.is(store.snapshot().db, 2)

  store.dispatch(['double'])
  await flush()
  t.is(store.snapshot().db, 4)

  store.dispatch(['double'])
  await flush()
  t.is(store.snapshot().db, 8)
})

test('dispatch > converts arguments to an array if called with an unwrapped string', async t => {
  const store = reframe.createStore(0)
  store.registerEventDB('increment', db => db + 1)
  store.dispatch('increment') // vs [increment]
  await flush()
  t.is(store.snapshot().db, 1)
})

test('snapshot > returns an object containing the current state', async t => {
  const store = reframe.createStore(0)
  store.registerEventDB('increment', db => db + 1)

  store.dispatch(['increment'])
  store.dispatch(['increment'])
  store.dispatch(['increment'])
  await flush()
  const snapshot = store.snapshot() // should be 3

  store.dispatch(['increment'])
  store.dispatch(['increment'])
  store.dispatch(['increment'])
  await flush()

  t.is(snapshot.db, 3)
  t.is(store.snapshot().db, 6)
})

test('snapshot > can restore store to snapshotted state', async t => {
  const store = reframe.createStore(0)
  store.registerEventDB('increment', db => db + 1)
  const snapshot = store.snapshot() // should be 3

  store.dispatch(['increment'])
  store.dispatch(['increment'])
  store.dispatch(['increment'])
  await flush()

  t.is(store.snapshot().db, 3)
  snapshot.restore()
  t.is(store.snapshot().db, 0)
})

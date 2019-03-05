import test from "ava"
import {createStore} from "@re-frame/store"
import {enableTimeTravel} from "../lib/devtools.js"

function makeStore({events, maxHistorySize}) {
  const store = createStore({count: 0})
  enableTimeTravel(store, {maxHistorySize})

  store.registerEventDB("count", db => ({count: db.count + 1}))
  while (events-- > 0) {
    store.dispatchSync(["count"])
  }
  return store
}

test("can move backwards through time", t => {
  const store = makeStore({events: 4})
  store.previous()
  t.deepEqual(store.getState(), {count: 3})
  store.previous()
  t.deepEqual(store.getState(), {count: 2})
  store.previous()
  t.deepEqual(store.getState(), {count: 1})
  store.previous()
  t.deepEqual(store.getState(), {count: 0})
})

test("can move forward through time", t => {
  const store = makeStore({events: 4})
  store.previous()
  store.previous()
  store.previous()
  store.previous()
  t.deepEqual(store.getState(), {count: 0})
  store.next()
  t.deepEqual(store.getState(), {count: 1})
  store.next()
  t.deepEqual(store.getState(), {count: 2})
  store.next()
  t.deepEqual(store.getState(), {count: 3})
  store.next()
  t.deepEqual(store.getState(), {count: 4})
})

test("cannot travel beyond history", t => {
  const store = makeStore({events: 4})

  store.previous()
  store.previous()
  store.previous()
  store.previous()
  t.deepEqual(store.getState(), {count: 0}) // at earliest entry
  store.previous()
  t.deepEqual(store.getState(), {count: 0}) // should not have moved

  store.next()
  store.next()
  store.next()
  store.next()
  t.deepEqual(store.getState(), {count: 4}) // at newest entry
  store.next()
  t.deepEqual(store.getState(), {count: 4}) // should not have moved
})

test("respects maxHistorySize", t => {
  const store = makeStore({events: 4, maxHistorySize: 5})
  store.dispatchSync(["count"])
  store.dispatchSync(["count"])
  store.dispatchSync(["count"])
  store.dispatchSync(["count"])
  store.dispatchSync(["count"])
  t.deepEqual(store.getState(), {count: 9}) // at most recent entry
  store.next()
  t.deepEqual(store.getState(), {count: 9}) // cannot move any further forward
  store.previous()
  store.previous()
  store.previous()
  store.previous()
  t.deepEqual(store.getState(), {count: 5}) // at earliest
  store.previous()
  t.deepEqual(store.getState(), {count: 5}) // cannot move any further back
})

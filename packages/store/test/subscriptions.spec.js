import test from "ava"
import {createStore} from "@re-frame/store"

function makeStore() {
  const store = createStore({count: 0})
  store.registerEventDB("count", db => ({count: db.count + 1}))
  return store
}

test("creating a subscription produces a synchronous value", t => {
  const store = makeStore()
  store.registerSubscription("count", db => db.count)

  const sub = store.subscribe(["count"])
  t.is(sub.deref(), 0)

  sub.dispose()
})

test('a top-level subscription is re-run whenever the "db" changes', t => {
  const calls = []
  const store = makeStore()
  store.registerSubscription("count", db => db.count)

  const sub = store.subscribe(["count"])
  store.dispatchSync(["count"])
  t.is(sub.deref(), 1)
  store.dispatchSync(["count"])
  t.is(sub.deref(), 2)
  store.dispatchSync(["count"])
  t.is(sub.deref(), 3)

  sub.dispose()
})

test('"subscribe()" calls to the same query id share the same subscription', t => {
  const store = makeStore()
  store.registerSubscription("count", db => db.count)

  const subA = store.subscribe(["count"])
  const subB = store.subscribe(["count"])
  t.is(subA, subB)

  subA.dispose()
  subB.dispose()
})

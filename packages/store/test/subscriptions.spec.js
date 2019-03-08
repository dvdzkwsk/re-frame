import test from "ava"
import {createStore} from "@re-frame/store"

function makeStore() {
  const store = createStore({count: 0})
  store.registerEventDB("count", db => ({count: db.count + 1}))
  return store
}

test("subscribe() returns an atom with the current value of the subscription", t => {
  const store = makeStore()
  store.registerSubscription("count", db => db.count)

  const sub = store.subscribe(["count"])
  t.is(sub.deref(), 0)

  sub.dispose()
})

test('a top-level subscription is re-run whenever the "db" changes', t => {
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

test("subscriptions don't notify watchers if their value didn't change", t => {
  const calls = []
  const store = makeStore()
  store.registerSubscription("count", db => db.count)
  store.registerEventDB("noop", db => db)

  const sub = store.subscribe(["count"])
  sub.watch((...args) => calls.push(args))

  store.dispatchSync(["count"])
  t.deepEqual(calls, [[0, 1]])
  store.dispatchSync(["noop"])
  store.dispatchSync(["noop"])
  t.deepEqual(calls, [[0, 1]])
  store.dispatchSync(["count"])
  t.deepEqual(calls, [[0, 1], [1, 2]])
})

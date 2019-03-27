import test from "ava"
import {createStore} from "@re-frame/store"

global.requestAnimationFrame = fn => setTimeout(fn)

async function flush() {
  await Promise.resolve() // let dispatch run
  await new Promise(resolve => setTimeout(resolve)) // let subscriptions run
}

function makeStore() {
  const store = createStore()
  store.registerEventDB("init", () => ({count: 0}))
  store.registerEventDB("count", db => ({count: db.count + 1}))
  store.dispatchSync(["init"])
  return store
}

test("subscribe() returns an atom with the current value of the subscription", t => {
  const store = makeStore()
  store.registerSubscription("count", db => db.count)

  const sub = store.subscribe(["count"])
  t.is(sub.deref(), 0)

  sub.dispose()
})

test("subscriptions expose their underlying query", t => {
  const store = makeStore()
  store.registerSubscription("count", db => db.count)

  const sub = store.subscribe(["count"])
  t.deepEqual(sub.query, ["count"])

  sub.dispose()
})

test('a top-level subscription is re-run whenever the "db" changes', async t => {
  const store = makeStore()
  store.registerSubscription("count", db => db.count)
  const sub = store.subscribe(["count"])

  store.dispatch(["count"])
  await flush()
  t.is(sub.deref(), 1)

  store.dispatch(["count"])
  await flush()
  t.is(sub.deref(), 2)

  store.dispatch(["count"])
  await flush()
  t.is(sub.deref(), 3)

  sub.dispose()
})

test("subscriptions don't notify watchers if their value didn't change", async t => {
  const calls = []
  const store = makeStore()
  store.registerSubscription("count", db => db.count)
  store.registerEventDB("noop", db => db)

  const sub = store.subscribe(["count"])
  sub.watch((...args) => calls.push(args))

  store.dispatch(["count"])
  await flush()
  t.deepEqual(calls, [[0, 1]])
  store.dispatch(["noop"])
  store.dispatch(["noop"])
  await flush()
  t.deepEqual(calls, [[0, 1]])
  store.dispatch(["count"])
  await flush()
  t.deepEqual(calls, [[0, 1], [1, 2]])

  sub.dispose()
})

import test from "ava"
import {createStore} from "@re-frame/store"

async function flush() {
  await Promise.resolve() // let dispatch run
  await new Promise(resolve => setTimeout(resolve)) // let subscriptions run
}

function makeStore() {
  const store = createStore()
  store.registerEventDB("init", () => ({count: 0}))
  store.registerEventDB("count", db => ({count: db.count + 1}))
  store.dispatchSync({id: "init"})
  return store
}

test("subscribe() returns an atom with the current value of the subscription", t => {
  const store = makeStore()
  store.computed("count", db => db.count)

  const sub = store.subscribe(["count"])
  t.is(sub.deref(), 0)

  sub.dispose()
})

test("subscribe() returns an atom with the current value of the subscription for complex queries", t => {
  const store = makeStore()
  store.computed("key", (db, query) => db[query[1]])
  const sub = store.subscribe(["key", "count"])
  t.is(sub.deref(), 0)

  sub.dispose()
})

test('a top-level subscription is re-run whenever the "db" changes', async t => {
  const store = makeStore()
  store.computed("count", db => db.count)
  const sub = store.subscribe(["count"])

  store.dispatch({id: "count"})
  await flush()
  t.is(sub.deref(), 1)

  store.dispatch({id: "count"})
  await flush()
  t.is(sub.deref(), 2)

  store.dispatch({id: "count"})
  await flush()
  t.is(sub.deref(), 3)

  sub.dispose()
})

test("subscriptions don't notify watchers if their value didn't change", async t => {
  const history = []
  const store = makeStore()
  store.computed("count", db => db.count)
  store.registerEventDB("noop", db => db)

  const sub = store.subscribe(["count"])
  sub.watch(val => history.push(val))

  store.dispatch({id: "count"})
  await flush()
  t.deepEqual(history, [1])
  store.dispatch({id: "noop"})
  store.dispatch({id: "noop"})
  await flush()
  t.deepEqual(history, [1])
  store.dispatch({id: "count"})
  await flush()
  t.deepEqual(history, [1, 2])

  sub.dispose()
})

test("simple (no query args) subscriptions are de-duplicated", async t => {
  const store = makeStore()

  let calls = 0
  store.registerEventDB("double", db => ({count: db.count * 2}))
  store.computed("count", db => {
    calls++
    return db.count
  })
  // All subscriptions should be the same
  const sub1 = store.subscribe(["count"])
  const sub2 = store.subscribe(["count"])
  const sub3 = store.subscribe(["count"])
  t.is(sub1, sub2)
  t.is(sub1, sub3)
  t.is(calls, 1) // subscription handler should only be called once

  store.dispatch({id: "double"})
  await flush()
  t.is(calls, 2) // subscription handler should only be called one more time

  sub1.dispose()
  sub2.dispose()
  sub3.dispose()
})

test("complex (1 or more query args) subscriptions are de-duplicated", async t => {
  const store = makeStore()

  let calls = 0
  store.registerEventDB("double", db => ({count: db.count * 2}))
  store.computed("count", db => {
    calls++
    return db.count
  })
  const sub1 = store.subscribe(["count", 1])

  // These two subscriptions should be the same
  const sub2 = store.subscribe(["count", 2])
  const sub3 = store.subscribe(["count", 2])
  t.not(sub1, sub2)
  t.is(sub2, sub3)
  t.is(calls, 2) // once for each unique subscription

  store.dispatch({id: "double"})
  await flush()
  t.is(calls, 4) // and again for each unique subscription

  sub1.dispose()
  sub2.dispose()
  sub3.dispose()
})

test("disposing of a shared subscription only closes the subscription if no more watchers exit", async t => {
  const store = makeStore()

  let calls = 0
  store.registerEventDB("double", db => ({count: db.count * 2}))
  store.computed("count", db => {
    calls++
    return db.count
  })
  const sub1 = store.subscribe(["count", 2])
  const sub2 = store.subscribe(["count", 2])
  const sub3 = store.subscribe(["count", 2])
  t.is(calls, 1)

  sub1.dispose()
  store.dispatch({id: "double"})
  await flush()
  t.is(calls, 2)

  sub2.dispose()
  store.dispatch({id: "double"})
  await flush()
  t.is(calls, 3)

  // Subscription should be inactive after sub3 disposes.
  sub3.dispose()
  store.dispatch({id: "double"})
  await flush()
  t.is(calls, 3) // unchanged from previous test
})

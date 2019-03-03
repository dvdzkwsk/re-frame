import test from 'ava'
import {http} from '../lib/http-fx.js'

function settlePromises() {
  return new Promise(res => setTimeout(res))
}

function spy(impl) {
  impl = impl || (() => {})
  const fn = (...args) => {
    fn.calls.push({arguments: args})
    const res = impl(...args)
    return res
  }
  fn.calls = []
  return fn
}

function makeStore() {
  return {
    dispatch: spy(),
  }
}

test('makes a fetch request to config.url', async t => {
  const store = makeStore()
  const fetch = spy(() => Promise.resolve(response))
  const response = {
    ok: true,
    headers: {
      get: spy(),
    },
  }

  const fx = http(store, {fetch})
  await fx({url: '/fake-url'})
  t.deepEqual(fetch.calls, [{arguments: ['/fake-url', {url: '/fake-url'}]}])
})

test('on "not ok" response, dispatches response as last value in "failure" event', async t => {
  const store = makeStore()
  const fetch = spy(() => Promise.resolve(response))
  const response = {
    ok: false,
    headers: {
      get: spy(),
    },
  }

  const fx = http(store, {fetch})
  await fx({url: '/fake-url', success: ['on-success'], failure: ['on-failure']})
  t.deepEqual(store.dispatch.calls, [{arguments: [['on-failure', response]]}])
})

test('on "ok" response, dispatches response as last value in "success" event', async t => {
  const store = makeStore()
  const fetch = spy(() => Promise.resolve(response))
  const response = {
    ok: true,
    headers: {
      get: spy(),
    },
  }

  const fx = http(store, {fetch})
  await fx({url: '/fake-url', success: ['on-success']})
  t.deepEqual(store.dispatch.calls, [{arguments: [['on-success', response]]}])
})

test('automatically parses json body if content-type matches "application/json"', async t => {
  const store = makeStore()
  const fetch = spy(() => Promise.resolve(response))
  const response = {
    ok: true,
    headers: {
      get: spy(header => {
        if (header === 'content-type') {
          return 'application/json; charset=utf-8'
        }
      }),
    },
    json: () => Promise.resolve({mockJsonObject: true}),
  }

  const fx = http(store, {fetch})
  await fx({url: '/fake-url', success: ['on-success']})
  t.deepEqual(store.dispatch.calls, [
    {arguments: [['on-success', {mockJsonObject: true}]]},
  ])
})

test('if response is not "ok" and config.failure is undefined, bubble the promise rejection', async t => {
  t.plan(1)
  const store = makeStore()
  const fetch = spy(() => Promise.resolve(response))
  const response = {
    ok: false,
  }

  const fx = http(store, {fetch})
  try {
    await fx({url: '/fake-url'})
  } catch (e) {
    t.is(e, response)
  }
})

test('when config is an Array, runs all requests in parallel', async t => {
  const store = makeStore()
  const fetch = spy(() => Promise.resolve(response))
  const response = {
    ok: true,
    headers: {
      get: spy(),
    },
  }

  const fx = http(store, {fetch})
  await fx([{url: '/request-1'}, {url: '/request-2'}, {url: '/request-3'}])
  t.deepEqual(fetch.calls, [
    {arguments: ['/request-1', {url: '/request-1'}]},
    {arguments: ['/request-2', {url: '/request-2'}]},
    {arguments: ['/request-3', {url: '/request-3'}]},
  ])
})

test('when config is an Array, returns a promise that resolves when all requests are complete', async t => {
  const store = makeStore()
  const firstPromise = new Promise(async resolve => {
    await settlePromises()
    firstPromise.resolve = resolve
  })
  const secondPromise = new Promise(async resolve => {
    await settlePromises()
    secondPromise.resolve = resolve
  })
  const lastPromise = new Promise(async resolve => {
    await settlePromises()
    lastPromise.resolve = resolve
  })

  const promises = [firstPromise, secondPromise, lastPromise]
  const fetch = spy(() => promises.shift())
  const response = {
    ok: true,
    headers: {
      get: () => {},
    },
  }
  const done = spy()
  const fx = http(store, {fetch})
  fx([{url: '/request-1'}, {url: '/request-2'}, {url: '/request-3'}]).then(done)
  await settlePromises()

  t.deepEqual(done.calls, [])
  firstPromise.resolve(response)
  await settlePromises()
  t.deepEqual(done.calls, [])

  secondPromise.resolve(response)
  await settlePromises()
  t.deepEqual(done.calls, [])

  lastPromise.resolve(response)
  await settlePromises()
  t.deepEqual(done.calls, [{arguments: [[response, response, response]]}])
})

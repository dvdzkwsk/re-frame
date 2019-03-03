import test from 'ava'
import {http} from '../lib/http-fx.js'

async function settlePromises() {
  await new Promise(res => setTimeout(res))
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
    headers: {
      get: spy(),
    },
  }

  const fx = http(store, {fetch})
  fx({url: '/fake-url'})
  await settlePromises()
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
  fx({url: '/fake-url', success: ['on-success'], failure: ['on-failure']})
  await settlePromises()
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
  fx({url: '/fake-url', success: ['on-success']})
  await settlePromises()
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
  fx({url: '/fake-url', success: ['on-success']})
  await settlePromises()
  t.deepEqual(store.dispatch.calls, [
    {arguments: [['on-success', {mockJsonObject: true}]]},
  ])
})

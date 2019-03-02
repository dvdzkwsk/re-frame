import test from 'ava'
import {orchestrate} from '../lib/orchestrate-fx.js'

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
  let fxHandler
  let orchestrateEffect
  let postEventCallback
  return {
    registerEventFX: (id, handler) => {
      fxHandler = handler
    },
    dispatch: spy(event => {
      if (event[0] === 'boot') {
        orchestrateEffect(fxHandler(event).orchestrate)
      }

      if (postEventCallback) {
        postEventCallback(event)
      }
    }),
    registerEffect(id, handler) {
      orchestrateEffect = handler
    },
    addPostEventCallback: spy(cb => {
      postEventCallback = cb
    }),
    removePostEventCallback: spy(() => {
      postEventCallback = null
    }),
  }
}

test('orchestrate > does not register a postEventCallback if rules is empty', t => {
  const store = makeStore()
  store.registerEffect('orchestrate', orchestrate(store))
  store.registerEventFX('boot', () => ({
    orchestrate: {
      dispatch: ['first-dispatch'],
      rules: [],
    },
  }))
  store.dispatch(['boot'])
  t.deepEqual(store.addPostEventCallback.calls, [])

  store.registerEventFX('boot', () => ({
    orchestrate: {
      dispatch: ['first-dispatch'],
    },
  }))
  store.dispatch(['boot'])
  t.deepEqual(store.addPostEventCallback.calls, [])
})

test('orchestrate > if an initial "dispatch" event is provided, it is dispatched to the store', t => {
  const store = makeStore()
  store.registerEffect('orchestrate', orchestrate(store))
  store.registerEventFX('boot', () => ({
    orchestrate: {
      dispatch: ['first-dispatch'],
      rules: [{after: 'first-dispatch', halt: true}],
    },
  }))
  store.dispatch(['boot'])
  t.deepEqual(store.dispatch.calls, [
    {arguments: [['boot']]},
    {arguments: [['first-dispatch']]},
  ])
})

test('orchestrate > does not perfom an initial "dispatch" event if one is not provided', t => {
  const store = makeStore()
  store.registerEffect('orchestrate', orchestrate(store))
  store.registerEventFX('boot', () => ({
    orchestrate: {
      rules: [{after: 'first-dispatch', halt: true}],
    },
  }))
  store.dispatch(['boot'])
  t.deepEqual(store.dispatch.calls, [{arguments: [['boot']]}])
})

test('orchestrate > when an "after" event is seen, its corresponding "dispatch" is dispatched', t => {
  const store = makeStore()
  store.registerEffect('orchestrate', orchestrate(store))
  store.registerEventFX('boot', () => ({
    orchestrate: {
      dispatch: ['first-dispatch'],
      rules: [
        {after: 'first-dispatch', dispatch: ['second-dispatch'], halt: true},
      ],
    },
  }))
  store.dispatch(['boot'])
  t.deepEqual(store.dispatch.calls, [
    {arguments: [['boot']]},
    {arguments: [['first-dispatch']]},
    {arguments: [['second-dispatch']]},
  ])
})

test('orchestrate > a rule can also dispatch multiple events with "dispatchN"', t => {
  const store = makeStore()
  store.registerEffect('orchestrate', orchestrate(store))
  store.registerEventFX('boot', () => ({
    orchestrate: {
      dispatch: ['first-dispatch'],
      rules: [
        {after: 'first-dispatch', dispatchN: [['a'], ['b'], ['c']], halt: true},
      ],
    },
  }))
  store.dispatch(['boot'])
  t.deepEqual(store.dispatch.calls, [
    {arguments: [['boot']]},
    {arguments: [['first-dispatch']]},
    {arguments: [['a']]},
    {arguments: [['b']]},
    {arguments: [['c']]},
  ])
})

test('orchestrate > multiple rules can be triggered by the same event', t => {
  const store = makeStore()
  store.registerEffect('orchestrate', orchestrate(store))
  store.registerEventFX('boot', () => ({
    orchestrate: {
      dispatch: ['first-dispatch'],
      rules: [
        {after: 'first-dispatch', dispatch: ['a']},
        {after: 'first-dispatch', dispatch: ['b']},
      ],
    },
  }))
  store.dispatch(['boot'])
  t.deepEqual(store.dispatch.calls, [
    {arguments: [['boot']]},
    {arguments: [['first-dispatch']]},
    {arguments: [['a']]},
    {arguments: [['b']]},
  ])
})

// TODO: is this desired behavior? I don't necessarily think so.
test('orchestrate > "halt" takes effect only after all rules are applied to the current event', t => {
  const store = makeStore()
  store.registerEffect('orchestrate', orchestrate(store))
  store.registerEventFX('boot', () => ({
    orchestrate: {
      dispatch: ['first-dispatch'],
      rules: [
        {after: 'first-dispatch', dispatch: ['a'], halt: true},
        {after: 'first-dispatch', dispatch: ['b'], halt: true},
      ],
    },
  }))
  store.dispatch(['boot'])
  t.deepEqual(store.dispatch.calls, [
    {arguments: [['boot']]},
    {arguments: [['first-dispatch']]},
    {arguments: [['a']]},
    {arguments: [['b']]},
  ])

  // we've halted, rules should no longer be triggered
  store.dispatch(['first-dispatch'])
  t.deepEqual(store.dispatch.calls, [
    {arguments: [['boot']]},
    {arguments: [['first-dispatch']]},
    {arguments: [['a']]},
    {arguments: [['b']]},
    {arguments: [['first-dispatch']]},
  ])
})

test('orchestrate > halts if a rule with "halt: true" is triggered', t => {
  const store = makeStore()
  store.registerEffect('orchestrate', orchestrate(store))
  store.registerEventFX('boot', () => ({
    orchestrate: {
      dispatch: ['first-dispatch'],
      rules: [
        {after: 'first-dispatch', dispatch: ['second-dispatch']},
        {after: 'second-dispatch', dispatch: ['third-dispatch'], halt: true},
      ],
    },
  }))
  store.dispatch(['boot'])
  t.deepEqual(store.dispatch.calls, [
    {arguments: [['boot']]},
    {arguments: [['first-dispatch']]},
    {arguments: [['second-dispatch']]},
    {arguments: [['third-dispatch']]},
  ])

  // should have halted, so rules should not be re-triggered
  store.dispatch.calls = []
  t.is(store.removePostEventCallback.calls.length, 1)
  store.dispatch(['first-dispatch'])
  t.deepEqual(store.dispatch.calls, [{arguments: [['first-dispatch']]}])
})

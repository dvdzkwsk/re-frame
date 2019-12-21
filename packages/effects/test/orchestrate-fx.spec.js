import test from "ava"
import {orchestrate} from "../lib/orchestrate-fx.js"

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
      if (event.id === "boot") {
        orchestrateEffect(fxHandler(event).orchestrate)
      }
      if (postEventCallback) {
        postEventCallback(event)
      }
    }),
    registerEffect(id, handler) {
      orchestrateEffect = handler
    },
    registerPostEventCallback: spy(cb => {
      postEventCallback = cb
    }),
    removePostEventCallback: spy(() => {
      postEventCallback = null
    }),
  }
}

test("orchestrate > does not register a postEventCallback if rules is empty", t => {
  const store = makeStore()
  store.registerEffect("orchestrate", orchestrate(store))
  store.registerEventFX("boot", () => ({
    orchestrate: {
      dispatch: {id: "first-dispatch"},
      rules: [],
    },
  }))
  store.dispatch(["boot"])
  t.deepEqual(store.registerPostEventCallback.calls, [])

  store.registerEventFX("boot", () => ({
    orchestrate: {
      dispatch: {id: "first-dispatch"},
    },
  }))
  store.dispatch({id: "boot"})
  t.deepEqual(store.registerPostEventCallback.calls, [])
})

test('orchestrate > if an initial "dispatch" event is provided, it is dispatched to the store', t => {
  const store = makeStore()
  store.registerEffect("orchestrate", orchestrate(store))
  store.registerEventFX("boot", () => ({
    orchestrate: {
      dispatch: {id: "first-dispatch"},
      rules: [{after: "first-dispatch", halt: true}],
    },
  }))
  store.dispatch({id: "boot"})
  t.deepEqual(store.dispatch.calls, [
    {arguments: [{id: "boot"}]},
    {arguments: [{id: "first-dispatch"}]},
  ])
})

test('orchestrate > does not perfom an initial "dispatch" event if one is not provided', t => {
  const store = makeStore()
  store.registerEffect("orchestrate", orchestrate(store))
  store.registerEventFX("boot", () => ({
    orchestrate: {
      rules: [{after: "first-dispatch", halt: true}],
    },
  }))
  store.dispatch({id: "boot"})
  t.deepEqual(store.dispatch.calls, [{arguments: [{id: "boot"}]}])
})

test('orchestrate > when an "after" event is seen, its corresponding "dispatch" is dispatched', t => {
  const store = makeStore()
  store.registerEffect("orchestrate", orchestrate(store))
  store.registerEventFX("boot", () => ({
    orchestrate: {
      dispatch: {id: "first-dispatch"},
      rules: [
        {
          after: "first-dispatch",
          dispatch: {id: "second-dispatch"},
          halt: true,
        },
      ],
    },
  }))
  store.dispatch({id: "boot"})
  t.deepEqual(store.dispatch.calls, [
    {arguments: [{id: "boot"}]},
    {arguments: [{id: "first-dispatch"}]},
    {arguments: [{id: "second-dispatch"}]},
  ])
})

test("orchestrate > multiple rules can be triggered by the same event", t => {
  const store = makeStore()
  store.registerEffect("orchestrate", orchestrate(store))
  store.registerEventFX("boot", () => ({
    orchestrate: {
      dispatch: {id: "first-dispatch"},
      rules: [
        {after: "first-dispatch", dispatch: {id: "a"}},
        {after: "first-dispatch", dispatch: {id: "b"}},
      ],
    },
  }))
  store.dispatch({id: "boot"})
  t.deepEqual(store.dispatch.calls, [
    {arguments: [{id: "boot"}]},
    {arguments: [{id: "first-dispatch"}]},
    {arguments: [{id: "a"}]},
    {arguments: [{id: "b"}]},
  ])
})

// TODO: is this desired behavior? I don't necessarily think so.
test('orchestrate > "halt" takes effect only after all matching rules are run for a single current event', t => {
  const store = makeStore()
  store.registerEffect("orchestrate", orchestrate(store))
  store.registerEventFX("boot", () => ({
    orchestrate: {
      dispatch: {id: "first-dispatch"},
      rules: [
        {after: "first-dispatch", dispatch: {id: "a"}, halt: true},
        {after: "first-dispatch", dispatch: {id: "b"}, halt: true},
      ],
    },
  }))
  store.dispatch({id: "boot"})
  t.deepEqual(store.dispatch.calls, [
    {arguments: [{id: "boot"}]},
    {arguments: [{id: "first-dispatch"}]},
    {arguments: [{id: "a"}]},
    {arguments: [{id: "b"}]},
  ])

  // we've halted, rules should no longer be triggered
  store.dispatch({id: "first-dispatch"})
  t.deepEqual(store.dispatch.calls, [
    {arguments: [{id: "boot"}]},
    {arguments: [{id: "first-dispatch"}]},
    {arguments: [{id: "a"}]},
    {arguments: [{id: "b"}]},
    {arguments: [{id: "first-dispatch"}]},
  ])
})

test('orchestrate > halts if a rule with "halt: true" is triggered', t => {
  const store = makeStore()
  store.registerEffect("orchestrate", orchestrate(store))
  store.registerEventFX("boot", () => ({
    orchestrate: {
      dispatch: {id: "first-dispatch"},
      rules: [
        {after: "first-dispatch", dispatch: {id: "second-dispatch"}},
        {
          after: "second-dispatch",
          dispatch: {id: "third-dispatch"},
          halt: true,
        },
      ],
    },
  }))
  store.dispatch({id: "boot"})
  t.deepEqual(store.dispatch.calls, [
    {arguments: [{id: "boot"}]},
    {arguments: [{id: "first-dispatch"}]},
    {arguments: [{id: "second-dispatch"}]},
    {arguments: [{id: "third-dispatch"}]},
  ])

  // should have halted, so rules should not be re-triggered
  store.dispatch.calls = []
  t.is(store.removePostEventCallback.calls.length, 1)
  store.dispatch({id: "first-dispatch"})
  t.deepEqual(store.dispatch.calls, [{arguments: [{id: "first-dispatch"}]}])
})

import test from "ava"
import {orchestrate} from "@re-frame/effects"
import {createStore} from "@re-frame/store"
import {instrument} from "@re-frame/test-utils"

function makeStore() {
  const store = instrument(createStore())
  store.registerEffect("orchestrate", orchestrate)
  return store
}

test('orchestrate > if an initial "dispatch" event is provided, it is dispatched even if rules is empty', async t => {
  const store = makeStore()
  const events = []
  await store.act(() => {
    store.registerPostEventCallback(event => events.push(event))
    store.event("sentinal", db => db)
    store.event.fx("boot", () => ({
      orchestrate: {
        dispatch: "sentinal",
        rules: undefined,
      },
    }))
    store.dispatch("boot")
  })
  t.deepEqual(events, [{id: "boot"}, {id: "sentinal"}])
})

test('orchestrate > does not perfom an initial "dispatch" event if one is not provided', async t => {
  const store = makeStore()
  const events = []
  await store.act(() => {
    store.registerPostEventCallback(event => events.push(event))
    store.event.fx("boot", () => ({
      orchestrate: {},
    }))
    store.dispatch("boot")
  })
  t.deepEqual(events, [{id: "boot"}])
})

test('orchestrate > when an "after" event is seen, its corresponding "dispatch" is dispatched', async t => {
  const store = makeStore()
  const events = []
  await store.act(() => {
    store.registerPostEventCallback(event => events.push(event))
    store.event("sentinal-1", db => db)
    store.event("sentinal-2", db => db)

    store.event.fx("boot", () => ({
      orchestrate: {
        dispatch: "sentinal-1",
        rules: [
          {
            after: "sentinal-1",
            dispatch: "sentinal-2",
            halt: true,
          },
        ],
      },
    }))
    store.dispatch("boot")
  })
  t.deepEqual(events, [{id: "boot"}, {id: "sentinal-1"}, {id: "sentinal-2"}])
})

test("orchestrate > multiple rules can be triggered by the same event", async t => {
  const store = makeStore()
  const events = []
  await store.act(() => {
    store.registerPostEventCallback(event => events.push(event))
    store.event("sentinal-1", db => db)
    store.event("sentinal-2", db => db)
    store.event("sentinal-3", db => db)

    store.event.fx("boot", () => ({
      orchestrate: {
        dispatch: "sentinal-1",
        rules: [
          {
            after: "sentinal-1",
            dispatch: "sentinal-2",
          },
          {
            after: "sentinal-1",
            dispatch: "sentinal-3",
            halt: true,
          },
        ],
      },
    }))
    store.dispatch("boot")
  })
  t.deepEqual(events, [
    {id: "boot"},
    {id: "sentinal-1"},
    {id: "sentinal-2"},
    {id: "sentinal-3"},
  ])
})

test('orchestrate > halts if a rule with "halt: true" is triggered', async t => {
  const store = makeStore()
  const events = []
  store.registerPostEventCallback(event => events.push(event))
  store.event("sentinal-1", db => db)
  store.event("sentinal-2", db => db)
  store.event("sentinal-3", db => db)
  store.registerEventFX("boot", () => ({
    orchestrate: {
      dispatch: "sentinal-1",
      rules: [
        {after: "sentinal-1", dispatch: "sentinal-2", halt: true},
        {after: "sentinal-2", dispatch: "sentinal-3"},
      ],
    },
  }))

  // Stops running after dispatching sentinal-2 after seeing sentinal-1
  await store.act(() => {
    store.dispatch("boot")
  })

  t.deepEqual(events, [{id: "boot"}, {id: "sentinal-1"}, {id: "sentinal-2"}])

  // Should no longer be watching for any events, so even if sentinal-2 is manually
  // dispatched, its rule should not be run.
  await store.act(() => {
    store.dispatch("sentinal-2")
  })
  t.deepEqual(events, [
    {id: "boot"},
    {id: "sentinal-1"},
    {id: "sentinal-2"},
    {id: "sentinal-2"},
  ])
})

// TODO: is this desired behavior?
test('orchestrate > "halt" takes effect only after all matching rules are run for a single current event', async t => {
  const store = makeStore()
  const events = []
  store.registerPostEventCallback(event => events.push(event))
  store.event("sentinal-1", db => db)
  store.event("sentinal-2", db => db)
  store.event("sentinal-3", db => db)
  store.event.fx("boot", () => ({
    orchestrate: {
      dispatch: "sentinal-1",
      rules: [
        {
          after: "sentinal-1",
          dispatch: "sentinal-2",
          halt: true,
        },
        {
          after: "sentinal-1",
          dispatch: "sentinal-3",
          halt: true,
        },
      ],
    },
  }))

  await store.act(() => {
    store.dispatch("boot")
  })
  t.deepEqual(events, [
    {id: "boot"},
    {id: "sentinal-1"},
    {id: "sentinal-2"},
    {id: "sentinal-3"},
  ])
})

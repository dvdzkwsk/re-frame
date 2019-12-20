# Effects

TODO: Describe what effects are.

## HTTP

```js
import {http} from "@re-frame/effects"
import {createStore} from "@re-frame/store"

const store = createStore()
store.registerEffect("http", http)

store.event("load-data", ctx => ({
  db: {
    ...ctx.db,
    loading: true,
  },
  http: {
    method: "GET",
    url: "my.api.com/endpoint",
    success: "load-data-success",
    failure: "load-data-failure",
  },
}))
store.event("load-data-success", (db, {response}) => {
  return {
    loading: false,
    data: response,
  }
})
store.event("load-data-failure", (db, {error}) => {
  return {
    loading: false,
    error,
  }
})
```

## Orchestrate

```js
import {orchestrate} from "@re-frame/effects"
import {createStore} from "@re-frame/store"

const store = createStore()
store.effect("orchestrate", orchestrate)

store.event.fx("boot", () => ({
  orchestrate: {
    dispatch: {id: "first-event"},
    rules: [
      {after: "first-event", dispatch: {id: "second-event"}},
      {
        after: "second-event",
        dispatchN: [{id: "third-event"}, {id: "fourth-event"}],
      },
      {after: "third-event", dispatch: {id: "last-event"}, halt: true},
    ],
  },
}))
```

## Creating Custom Effects

While this packages provides numerous built-in effects for you, it's also easy to define your own:

```js
store.effect("wait", store => config => {
  setTimeout(() => {
    store.dispatch(config.dispatch)
  }, config.ms)
})

store.event.fx("test-wait", ctx => ({
  db: {
    ...ctx.db,
    waiting: true,
  },
  wait: {
    ms: 5000,
    dispatch: "done-waiting",
  },
}))
```

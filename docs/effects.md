# Effects

XXX Describe what effects are and what's available.

## HTTP

```js
import {http} from "@re-frame/effects"
import {createStore} from "@re-frame/store"

const store = createStore()
store.registerEffect("http", http)

store.registerEventFX("load-data", ctx => ({
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
store.registerEventDB("load-data-success", (db, {response}) => {
  return {
    loading: false,
    data: response,
  }
})
store.registerEventDB("load-data-failure", (db, {error}) => {
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
store.registerEffect("orchestrate", orchestrate)

store.registerEventFX("boot", () => ({
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

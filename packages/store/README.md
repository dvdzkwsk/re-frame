# @re-frame/store

Below is an example that shows how to create a store, define event handlers, setup and access subscriptions, and run side effects. For now, you should refer to the original re-frame documentation for best practices.

Unlike the original re-frame library which uses a singleton store, the JavaScript package provides an API for creating your own independent stores. If you want the convenience of a global store, use `@re-frame/global`.

```js
import {createStore} from "@re-frame/store"

const store = createStore()
```

A store holds application state in an object called "db" (it's your in-memory database). To make updates to the db, you register and dispatch events:

```js
// Define event handlers:
store.event("init", (db, event) => ({count: 0}))
store.event("increment", (db, event) => ({count: db.count + 1}))

// Send events to the store:
store.dispatch("init") // db = { count: 0 }
store.dispatch("increment") // db = { count: 1 }
store.dispatch("increment") // db = { count: 2 }

// Pass data with events:
store.event("add", (db, {amount}) => ({count: db.count + amount}))
store.dispatch("add", {amount: 5})
```

To access the db, register queries with the store. All active queries are recomputed every time the db changes, and are only recomputed once per change regardless of how many subscribers exist.

```js
store.computed("count", db => db.count)

const count = store.subscribe("count")

store.dispatchSync("init")       // db = { count: 0 }
count.deref()                    // 0
store.dispatchSync("increment")  // db = { count: 1 }
count.deref()                    // 1

// You can also watch a subscription to see all changes over time:
count.watch(value => { ... })

// Cleanup your subscription when you're done with it.
count.dispose()

// You can also pass parameters to the query:
store.computed("todos", (db, { completed }) => {
  return db.todos.filter(todo => todo.completed === completed)
})
store.subscribe("todos", { completed: false })
```

Most events will simply update the store's state. This update is one particular type of effect that events can have (appropriately called the "db" effect"), and while most events will only update the db, you can step up a level and trigger any number of effects.

```js
import {http} from "@re-frame/effects"

// Register your effect with the store:
store.effect("http", http)

// Define an event handler that will trigger that effect:
store.event.fx("load-data", (ctx, event) => ({
  // Updates your store state ("db")
  db: {
    ...ctx.db,
    loadingData: true,
  },
  // Also triggers an "http" effect to make a network request.
  http: {
    url: "my.api.com/endpoint",
    method: "GET",
    success: "load-data-success",
    failure: "load-data-failure",
  },
}))

// Initiate the effect:
store.dispatch("load-data")
```

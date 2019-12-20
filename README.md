# re-frame

[![Build Status](https://travis-ci.com/davezuko/re-frame.svg?branch=master)](https://travis-ci.com/davezuko/re-frame)
[![Bundle Size](https://badgen.net/bundlephobia/minzip/@re-frame/core)](https://bundlephobia.com/result?p=@re-frame/core)

Vanilla JavaScript port of the popular [ClojureScript library](https://github.com/Day8/re-frame) for pragmatic, flux-like state management. I highly recommend checking out re-frame's [original documentation](https://github.com/Day8/re-frame/blob/master/docs/INTRO.md) to learn about its philosophy, terminology, and patterns. All design credit goes to the original authors — thank you for the inspiration.

## Why re-frame?

Re-frame helps make state management predictable, testable, and pragmatic. It achieves this via message passing, which decouples action from intent. On top of this, it provides [first-class semantics](./docs/effects.md) for dealing with side-effects, as these are unavoidable in real-world applications.

From a high-level, re-frame is flux-like with events and event handlers, which are similar to redux's actions and reducers. [Compared to redux](./docs/re-frame-vs-redux.md), re-frame is more feature complete out of the box, with built-in interceptors, effects, subscriptions, and test utilties. You'll find that you can be productive without needing to reach for third-party middleware.

## Getting Started

The quickest way to get started is by installing `@re-frame/standalone`, which bundles everything you'll need to build a typical application: a store to manage state, subscriptions to query it, effects such as [http](./docs/effects.md#http), [orchestrate](./docs/effects.md#orchestrate), and more since the real world is more complicated than TodoMVC.

```sh
yarn add @re-frame/standalone
```

Once you've become familiar with re-frame, feel free to install only the packages you need to cut down on install size. You'll need @re-frame/store to create a store, but everything else is optional.

| Package                                                     | Description                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------ |
| [@re-frame/store](./packages/store/README.md)               | Creates a re-frame store (ergonomic API over @re-frame/core) |
| [@re-frame/core](./packages/core/README.md)                 | Low-level store API                                          |
| [@re-frame/effects](./packages/effects/README.md)           | Useful effects for most web apps (HTTP, orchestrate, etc.)   |
| [@re-frame/interceptors](./packages/interceptors/README.md) | Common interceptors (path, immer, debug, etc.)               |
| [@re-frame/react](./packages/react/README.md)               | React bindings (useDispatch, useSubscription)                |
| [@re-frame/preact](./packages/preact/README.md)             | Preact bindings (useDispatch, useSubscription)               |
| [@re-frame/global](./packages/global/README.md)             | A global re-frame store instance                             |

## Usage

Below is an example that shows how to create a store, define event handlers, setup and access subscriptions, and run side effects. For now, you should refer to the original re-frame documentation for best practices.

Unlike the original re-frame library which uses a singleton store, the JavaScript package provides an API for creating your own independent stores. If you want the convenience of a global store, use @re-frame/global.

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
store.dispatch("init")       // db = { count: 0 }
store.dispatch("increment")  // db = { count: 1 }
store.dispatch("increment")  // db = { count: 2 }

// Pass data with events:
store.event("add", (db, { amount }) => ({ count: db.count + amount }))
store.dispatch("add", { amount: 5 })
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

## Differences from Clojure's re-frame

@re-frame's API provides the same conceptual ideas as the original re-frame library, with a few name changes to make them more compact and palatable to developers that are used to mobx and redux:

| @re-frame/store API             | Clojure re-frame API                  |
| ------------------------------- | ------------------------------------- |
| `store.event("id", handler)`    | `(re-frame/reg-event-db :id handler)` |
| `store.event.fx("id", handler)` | `(re-frame/reg-event-fx :id handler)` |
| `store.effect("id", handler)`   | `(re-frame/reg-fx :id handler)`       |
| `store.computed("id", handler)` | `(re-frame/reg-sub :id handler)`      |
| `store.subscribe("id", params)` | `(re-frame/subscribe [:id arg])`      |
| `store.dispatch("id", payload)` | `(re-frame/dispatch [:id arg])`       |

Low-level store API:

| @re-frame/core API                          | Clojure re-frame API                  |
| ------------------------------------------- | ------------------------------------- |
| `store.registerEventDB("id", handler)`      | `(re-frame/reg-event-db :id handler)` |
| `store.registerEventFX("id", handler)`      | `(re-frame/reg-event-fx :id handler)` |
| `store.registerEffect("id", handler)`       | `(re-frame/reg-fx :id handler)`       |
| `store.registerSubscription("id", handler)` | `(re-frame/reg-sub :id handler)`      |
| `store.subscribe({ id, arg })`              | `(re-frame/subscribe [:id arg])`      |
| `store.dispatch({ id, arg })`               | `(re-frame/dispatch [:id arg])`       |

## Supported Browsers

| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="IE / Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>IE / Edge | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png" alt="Firefox" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>Firefox | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>Chrome | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari/safari_48x48.png" alt="Safari" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>Safari |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IE11, Edge                                                                                                                                                                                                      | last 2 versions                                                                                                                                                                                                   | last 2 versions                                                                                                                                                                                               | last 2 versions                                                                                                                                                                                               |

## License

The MIT License (MIT)

Copyright (c) 2018 David Zukowski<br />
Copyright (c) 2015-2017 Michael Thompson<br />
Copyright (c) 2017 Evgeny Poberezkin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

# re-frame

[![Build Status](https://travis-ci.com/davezuko/re-frame.svg?branch=master)](https://travis-ci.com/davezuko/re-frame)
[![Bundle Size](https://badgen.net/bundlephobia/minzip/@re-frame/store)](https://bundlephobia.com/result?p=@re-frame/store)

Vanilla JavaScript port of the popular [ClojureScript library](https://github.com/Day8/re-frame) for pragmatic, flux-like state management. I highly recommend checking out re-frame's [original documentation](https://github.com/Day8/re-frame/blob/master/docs/INTRO.md) to learn about its philosophy, terminology, and patterns. All design credit goes to the original authors — thank you for the inspiration.

## Why re-frame?

Re-frame helps make state management predictable, testable, and pragmatic. It achieves this via message passing, which decouples action from intent. On top of this, it provides [first-class semantics](./docs/effects.md) for dealing with side-effects, as these are unavoidable in real-world applications.

From a high-level, re-frame is flux-like with events and event handlers, which are similar to redux's actions and reducers. [Compared to redux](./docs/re-frame-vs-redux.md), re-frame is more feature complete out of the box, with built-in interceptors, effects, subscriptions, and test utilties. You'll find that you can be productive without needing to reach for third-party middleware.

## Getting Started

The quickest way to get started is by installing `@re-frame/standalone`, which bundles everything you'll need to build a typical application: a store to manage state, subscriptions to query it, and effects such as [http](./docs/effects.md#http), [orchestrate](./docs/effects.md#orchestrate), and more since the real world is more complicated than TodoMVC.

```sh
yarn add @re-frame/standalone
```

Once you've become familiar with re-frame, feel free to install only the packages you need to cut down on install size. You'll need @re-frame/store to create a store, but everything else is optional.

| Package                                                     | Description                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| [@re-frame/store](./packages/store/README.md)               | Creates an instance of a re-frame store                    |
| [@re-frame/effects](./packages/effects/README.md)           | Useful effects for most web apps (HTTP, orchestrate, etc.) |
| [@re-frame/interceptors](./packages/interceptors/README.md) | Common interceptors (path, immer, debug, etc.)             |
| [@re-frame/react](./packages/react/README.md)               | React bindings (useDispatch, useSubscription)              |
| [@re-frame/preact](./packages/preact/README.md)             | Preact bindings (useDispatch, useSubscription)             |
| [@re-frame/global](./packages/global/README.md)             | A global re-frame store instance                           |

## Usage

@re-frame's API provides the same conceptual ideas as the original re-frame library, with a few name changes to make them more compact and palatable to developers that are used to mobx and redux:

| @re-frame/store API                    | Clojure re-frame API                         |
| -------------------------------------- | -------------------------------------------- |
| `store.registerEventDB("id", handler)` | `(re-frame/reg-event-db :id handler)`        |
| `store.registerEventFX("id", handler)` | `(re-frame/reg-registerEventFX :id handler)` |
| `store.dispatch(["id", arg])`          | `(re-frame/dispatch [:id arg])`              |
| `store.computed("id", handler)`        | `(re-frame/reg-sub :id handler)`             |
| `store.subscribe(["id", arg])`         | `(re-frame/subscribe [:id arg])`             |
| `store.registerEffect("id", handler)`  | `(re-frame/reg-fx :id handler)`              |

Below is an example that shows how to create a store, define event handlers, setup and access subscriptions, and run side effects. For now, you should refer to the original re-frame documentation for best practices.

```js
import {createStore, http} from "@re-frame/standalone"

// Unlike the original re-frame library which uses a singleton store, the JavaScript
// package provides an API for creating your own independent stores. If you want the
// convenience of a global store, use @re-frame/global
const store = createStore()

// Register event handlers — these are how you'll change the store's state. In
// re-frame, the state of the store is called "db" (it's your in-memory database).
store.registerEventDB("init", (db, event) => ({count: 0}))
store.registerEventDB("increment", (db, event) => ({...db, count: db.count + 1}))
store.registerEventDB("add", (db, event) => {
  const [id, amount] = event
  return {...db, count: db.count + amount}
})

// Register computed values with the store. These will be recomputed whenever
// the state changes.
store.computed("count", db => db.count)

// You can subscribe to computed values (subscriptions) with store.subscribe:
const count = store.subscribe("count")
count.watch(value => /* ... */)

// Most events will simply update the store's state. In re-frame, updating the
// state (or "db") is done by triggering a "db" effect. For regular events, this
// is done automatically. However, you can step up a level and use "registerEventFX"
// to trigger any number of effects.
import {http} from "@re-frame/effects"
store.registerEffect("http", http)
store.registerEventFX("load-data", (ctx, event) => ({
  db: {
    ...ctx.db,
    loadingData: true,
  },
  http: {
    url: "my.api.com/endpoint",
    method: "GET",
    success: ["load-data-success"], // you will need to register these events as well
    failure: ["load-data-failure"],
  },
}))

// Dispatch events to the store.
store.dispatch(["init"])      // => count: 0
store.dispatch(["increment"]) // => count: 1
store.dispatch(["add", 4])    // => count: 5
store.dispatch(["load-data"]) // this will start an HTTP request
```

While [@re-frame/effects](./packages/effects/README.md) provides numerous built-in effects for you, it's also
easy to define your own:

```js
store.registerEffect("wait", store => config => {
  setTimeout(() => {
    store.dispatch(config.dispatch)
  }, config.ms)
})
store.registerEventFX("transition", (ctx, event) => ({
  db: {
    ...ctx.db,
    transitioning: true,
  },
  wait: {
    ms: 1000,
    dispatch: ["finish-transition"],
  },
})
store.registerEventDB("finish-transition", (db, event) => ({
  ...db,
  transitioning: false,
}))
```

## React Integration

1. Make your store available via React context by using `StoreProvider` from `@re-frame/react` at the root of your application. This will allow you to access subscriptions and dispatch events within the React tree.

> Using Preact? Use `@re-frame/preact` instead; its API is exactly the same.

```js
import React from "react"
import ReactDOM from "react-dom"
import {createStore} from "@re-frame/standalone"
import {StoreProvider} from "@re-frame/react"

const store = createStore()

const App = () => (
  <StoreProvider value={store}>
    <YourAppGoesHere />
  </StoreProvider>
)

ReactDOM.render(<App />, document.getElementById("root"))
```

2. Subscribe to your store from within the tree.

```js
import React from "react"
import {useSubscription} from "@re-frame/react"

const ChatList = () => {
  const chats = useSubscription(["chats"])
  return (
    <ol>
      {chats.map(chat => (
        <li key={chat.id}>{chat.title}</li>
      )}
    </ol>
  )
}
```

3. Dispatch events to your store.

```js
import React from "react"
import {useDispatch} from "@re-frame/react"

// useDispatch will dispatch the event you give it. We automatically take care
// of preventing duplicate dispatches on subsequent renders. If you want to
// re-dispatch an event, simply change the event id or the data included with
// it, such as "chatId" in the example below.
const ChatList = ({chatId}) => {
  useDispatch(["load-chats", chatId])
  // ... more logic here
}

// useDispatch also returns a "dispatch" function
const ChatList = () => {
  const dispatch = useDispatch()
  const onClick = () => {
    dispatch(["something-happened"])
  }
  // ... more logic here
}
```

## Supported Browsers

| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="IE / Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>IE / Edge | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png" alt="Firefox" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>Firefox | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>Chrome | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari/safari_48x48.png" alt="Safari" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)</br>Safari |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IE11, Edge                                                                                                                                                                                                      | last 2 versions                                                                                                                                                                                                   | last 2 versions                                                                                                                                                                                               | last 2 versions                                                                                                                                                                                               |

## License

The MIT License (MIT)

Copyright (c) 2018 David Zukowski<br />
Copyright (c) 2015-2017 Michael Thompson

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

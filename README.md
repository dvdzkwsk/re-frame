# re-frame
[![Build Status](https://travis-ci.com/davezuko/re-frame.svg?branch=master)](https://travis-ci.com/davezuko/re-frame)

JavaScript port of the popular [ClojureScript library](https://github.com/Day8/re-frame) for pragmatic, flux-like state management. I highly recommend checking out re-frame's [original documentation](https://github.com/Day8/re-frame/blob/master/docs/INTRO.md) to learn about its philosophy, patterns, and terminology. All design credit goes to the original authors — thank you for the inspiration.

## What is re-frame?

Re-frame helps make state management predictable, testable, and pragmatic. From a high-level, re-frame is flux-like with events and event handlers, which are similar to [redux's actions and reducers](./docs/re-frame-vs-redux.md). Compared to redux, re-frame is more feature complete out of the box, with built-in interceptors and subscriptions. You'll find that you can be productive without needing to reach for third-party middleware.

## Installation and Usage

```sh
# npm users
npm install --save @re-frame/core

# yarn users
yarn add @re-frame/core
```

This package can be used in two ways: as a [singleton](#singleton-mode) or as a [factory](#factory-mode). You should use the factory pattern in most cases, since it keeps your store's state and event handlers isolated from other libraries which may also be using re-frame.

## Singleton Mode

This should be familiar to re-frame users coming from Clojure, where re-frame is packaged as a singleton. In this mode, the store instance lives within the re-frame package, which means it can conveniently be imported anywhere.

```js
// any package can directly import the global store
import {dispatch, registerEventDB} from '@re-frame/core'

// register event handlers
registerEventDB('init', (db, event) => ({ count: 0 }))
registerEventDB('add', (db, [id, payload]) => ({
  ...db,
  count: db.count + payload,
})

// dispatch events
dispatch('init')    // global state = 0
dispatch('add', 1)  // global state = 1
dispatch('add', 2)  // global state = 3
dispatch('add', 3)  // global state = 6
```

A singleton affords certain conveniences, namely that the store and its methods can be imported directly from the re-frame package. This convenience cannot be understated. In practice, it means the store instance does not have to be threaded throughout the application. React developers may be familiar with using higher-order components such as `@connect` to inject the store, but this only applies to the React tree. If you wish to deal with the store outside of React, you often end up threading it through layers of application code.

There are drawbacks to using a singleton. For example, with server-side rendering it's necessary to pass around a dynamic store reference because multiple stores need to exist in parallel (since multiple requests can be handled concurrently). If all modules directly reference a singleton, it becomes nearly impossible to keep state isolated.

However, for many applications, especially those that are client-side only, it can be premature (and headache-inducing) to thread context. Pragmatism and convenience wins out for many use cases, which is why we provide a singleton. Nonetheless, you should be aware of the tradeoffs.

## Factory Mode

This should be familiar to redux users coming from React, and it's the best choice for library developers wishing to use re-frame. The `createStore` factory allows users to create stores that are completely isolated from each other, both in state and in handler/subscription registrations. Use this pattern when you need to support multiple or dynamic stores.

Library authors using re-frame should **exclusively** use factory mode. This avoids conflicts with other libraries or applications that also want to use re-frame for state management.

```js
import {dispatch, registerEventDB} from '@re-frame/core'

// create multiple independent stores
const initialState = { count: 0 }
const storeA = createStore(initialState)
const storeB = createStore(initialState)

// register event handlers
const increment = db => ({ ...db, count: count + 1 })
storeA.registerEventDB('increment', increment)
storeB.registerEventDB('increment', increment)

// events only affect the store they are dispatched to
storeA.dispatch('increment') // storeA state = { count: 1 }
                             // storeB state = { count: 0 } <-- unchanged
```

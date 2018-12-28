# re-frame

JavaScript port of the popular [ClojureScript library](https://github.com/Day8/re-frame). All credit goes to the original authors; thank you for the inspiration.

This package can be used in two ways: as a [singleton](#singleton-mode) or as a [factory](#factory-mode).

> You should use the factory pattern in most cases. This keeps your store state and event handlers isolated from other libraries that may also be using re-frame.

## Singleton Mode

This should be familiar to re-frame users coming from Clojure, where re-frame is packaged as a singleton. In this mode, the store instance lives within the re-frame package, which means it can conveniently be imported anywhere.

```js
import {dispatch, registerEventDB} from '@re-frame/core'

// register event handlers
registerEventDB('init', (db, event) => 1)
registerEventDB('increment', (db, [id, arg]) => db + arg)

// dispatch events
dispatch('init')         // global state = 1
dispatch('increment', 1) // global state = 2
dispatch('increment', 2) // global state = 4
dispatch('increment', 3) // global state = 7
dispatch('double')       // global state = 14
```

A singletone affords certain conveniences, namely that the store and its methods can be imported directly from the re-frame package. This convenience cannot be understated. In practice, it means the store instance does not have to be threaded throughout the application. React developers may be familiar with using higher-order components such as `@connect` to inject the store, but this only applies to the React tree. If you wish to deal with the store outside of React, you often end up threading it through layers of application code.

There are drawbacks to using a singleton. For example, with server-side rendering it's necessary to pass around a dynamic store reference because multiple stores need to exist in parallel (since multiple requests can be handled concurrently). If all modules directly reference a singleton, it becomes nearly impossible to keep state isolated.

However, for many applications, especially those that are client-side only, it can be premature (and headache-inducing) to thread context. Pragmatism and convenience wins out for many use cases, which is why we provide a singleton. Nonetheless, you should be aware of the tradeoffs.

## Factory Mode

This should be familiar to redux users coming from React, and it's the best choice for library developers wishing to use re-frame. The `createStore` factory allows users to create stores that are completely isolated from each other, both in state and in handler/subscription registrations. Use this pattern when you need to support multiple or dynamic stores.

Library authors using re-frame should **exclusively** use factory mode. This avoids conflicts with other libraries or applications that also want to use re-frame for state management.

```js
import {dispatch, registerEventDB} from '@re-frame/core'

// create your own isolated store instances
const initialState = { myValue: 1 }
const storeA = createStore(initialState)
const storeB = createStore(initialState)

// register event handlers
storeA.registerEventDB('double', (db, event) => ({
  ...db,
  myValue: db.myValue * 2,
}))
storeB.registerEventDB('double', (db, event) => ({
  ...db,
  myValue: db.myValue * 2,
}))

storeA.dispatch('double') // storeA state = { myValue: 2 }
                          // storeB state = { myValue: 1 } <-- unchanged
```

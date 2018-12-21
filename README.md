# re-frame

JavaScript port of the popular [ClojureScript library](https://github.com/Day8/re-frame). All credit goes to the original authors; thank you for the inspiration.

This package can be used in two ways: as a [singleton](#singleton-mode) or as a [factory](#factory-mode).

## Singleton Mode

This should be familiar to re-frame users coming from Clojure, where re-frame is packaged as a singleton. In this mode, the store state and registry are global.

```js
import {dispatch, registerEventDB} from 're-frame'

// register event handlers
registerEventDB('init', ([db, event]) => 1)
registerEventDB('double', ([db, event]) => db * 2)

// dispatch events
dispatch(['init'])   // global state = 1
dispatch(['double']) // global state = 2
dispatch(['double']) // global state = 4
```

A singletone affords certain conveniences, namely that the store and its methods can be imported directly from the re-frame package. This convenience cannot be understated. In practice, it means the store instance does not have to be threaded throughout the application. React developers should be familiar with the `@connect` decorator, but this only applies to the React tree. If you wish to deal with a store outside of React, you often end up threading the instance through layers of application code.

There are drawbacks to using a singleton. For example, with server-side rendering it's necessary to pass around a dynamic store reference because multiple stores need to exist in parallel (since multiple requests can be handled concurrently). If all modules directly reference a singleton, it becomes nearly impossible to keep states isolated.

However, for many applications, especially those that are client-side only, it can be premature (and headache-inducing) to thread context. Pragmatism and convenience wins out for many use cases, which is why we provide a singleton. Nonetheless, you should be aware of the tradeoffs.

## Factory Mode

This should be familiar to redux users coming from React. The `createStore` factory allows users to create stores that are completely isolated from each other, both in state and in handler/subscription registrations. Use this pattern when you need to support multiple or dynamic stores.

Library authors using re-frame should **exclusively** use factory mode. This avoids conflicts with other libraries or applications that also want to use re-frame for state management.

```js
import {createStore} from 're-frame'

// create your own isolated store instance
const store = createStore()

const initialState = { foo: 'bar' }
store.registerEventDB('init', () => initialState)
store.dispatch(['init']) // store state = { foo: 'bar' }
```

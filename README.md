# re-frame

[![Build Status](https://travis-ci.com/davezuko/re-frame.svg?branch=master)](https://travis-ci.com/davezuko/re-frame)
[![Bundle Size](https://badgen.net/bundlephobia/minzip/@re-frame/standalone)](https://bundlephobia.com/result?p=@re-frame/standalone)

Vanilla JavaScript port of the popular [ClojureScript library](https://github.com/Day8/re-frame) for pragmatic, flux-like state management. I highly recommend checking out re-frame's [original documentation](https://github.com/Day8/re-frame/blob/master/docs/INTRO.md) to learn about its philosophy, terminology, and patterns. All design credit goes to the original authors — thank you for the inspiration.

## Why re-frame?

Re-frame helps make state management predictable, testable, and pragmatic. From a high-level, re-frame is flux-like with events and event handlers, which are similar to [redux's actions and reducers](./docs/re-frame-vs-redux.md). Compared to redux, re-frame is more feature complete out of the box, with built-in interceptors, effects, and subscriptions. You'll find that you can be productive without needing to reach for third-party middleware.

## Getting Started

The quickest way to get started is by installing `@re-frame/standalone`, which bundles everything you'll need to build a typical application: a store to manage state, subscriptions to query it, first-class developer tools, and effects such as `http` since the real world is more complicated than TodoMVC.

```sh
yarn add @re-frame/standalone
```

## Usage

```js
import {createStore} from "@re-frame/standalone"

// You can optionally provide an initial value when creating a store.
const store = createStore({count: 0})

// Register event handlers — these are how you'll change the store's state.
store.registerEventDB("increment", db => ({...db, count: db.count + 1}))

// Register subscriptions with the store. Whenever the store's state changes
// these subscriptions will automatically recompute their values.
store.registerSubscription("count", db => db.count)

// Subscriptions are your means for accessing state inside the store. Calling
// subscribe() returns a subscription, which itself is a value. You can watch
// this subscription to observe changes, or pass it around and even compose it
// with other subscriptions.
// Most of the time you won't have to go through the trouble of manually watching
// a subscription. Instead, libraries like @re-frame/react allow you to access
// their values in your React tree and automatically re-render whenever they
// change. This pattern should be familiar to MobX users, for example.
const count = store.subscribe(["count"])
count.watch((prev, next) => {
  // do something here, maybe?
})

// Dispatch events to the store.
store.dispatch(["increment"])
store.dispatch(["increment"]) // count will be 2 after this event is processed
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

# re-frame

[![Build Status](https://travis-ci.com/davezuko/re-frame.svg?branch=master)](https://travis-ci.com/davezuko/re-frame)
[![Bundle Size](https://badgen.net/bundlephobia/minzip/@re-frame/store)](https://bundlephobia.com/result?p=@re-frame/store)

JavaScript port of the popular [ClojureScript library](https://github.com/Day8/re-frame) for pragmatic, flux-like state management. I highly recommend checking out re-frame's [original documentation](https://github.com/Day8/re-frame/blob/master/docs/INTRO.md) to learn about its philosophy, patterns, and terminology. All design credit goes to the original authors — thank you for the inspiration.

## Why re-frame?

Re-frame helps make state management predictable, testable, and pragmatic. From a high-level, re-frame is flux-like with events and event handlers, which are similar to [redux's actions and reducers](./docs/re-frame-vs-redux.md). Compared to redux, re-frame is more feature complete out of the box, with built-in interceptors and subscriptions. You'll find that you can be productive without needing to reach for third-party middleware.

## Installation

```sh
# npm users
npm install --save @re-frame/standalone

# yarn users
yarn add @re-frame/standalone
```

## Usage

```js
import {createStore} from '@re-frame/standalone'

// you can optionally provide an initial state as the first argument
const store = createStore({count: 0})

// register event handlers with your store
store.registerEventDB('increment', db => ({...db, count: count + 1}))
store.registerEventDB('add', (db, [id, value]) => ({...db, count: count + value]}))

// dispatch events to your store
store.dispatch(['increment']) // store state = { count: 1 }
store.dispatch(['increment']) // store state = { count: 2 }

// you can also supply a payload with the event
store.dispatch(['add', 3]) // store state = { count: 5 }
```

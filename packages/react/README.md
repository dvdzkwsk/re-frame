# @re-frame/react

1. Make your store available via React context by using `Provider` from `@re-frame/react` at the top of your application. This will allow you to access subscriptions and dispatch events within the React tree.

```js
import React from "react"
import ReactDOM from "react-dom"
import {createStore} from "@re-frame/standalone"
import {Provider} from "@re-frame/react"

const store = createStore()

const App = () => (
  <Provider store={store}>
    <YourAppGoesHere />
  </Provider>
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

// Dispatch will only fire once in this example
const ChatList = () => {
  useDispatch(["load-chats"])
  // ... more logic here
}

// Dispatch will fire every time `filter` changes
const ChatList = ({filter}) => {
  useDispatch(["load-chats", filter])
  // ... more logic here
}

// useDispatch also returns a "dispatch" function
const ChatList = () => {
  const dispatch = useDispatch() // does not dispatch anything
  const onClick = () => {
    dispatch(["some-click-event"])
  }
  // ... more logic here
}
```

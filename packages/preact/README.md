# @re-frame/preact

1. Make your store available via React context by using `Provider` from `@re-frame/react` at the top of your application. This will allow you to access subscriptions and dispatch events within the React tree.

```js
import {h, render} from "preact"
import {createStore} from "@re-frame/standalone"
import {Provider} from "@re-frame/preact"

const store = createStore()

const App = () => (
  <Provider store={store}>
    <YourAppGoesHere />
  </Provider>
)

render(<App />, document.getElementById("root"))
```

2. Subscribe to your store from within the tree.

```js
import {h} from "preact"
import {useSubscription} from "@re-frame/preact"

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
import {h} from "preact"
import {useDispatch} from "@re-frame/preact"

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

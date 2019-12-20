# @re-frame/preact

1. Make your store available via React context by using `Provider` from `@re-frame/preact` at the top of your application. This will allow you to access subscriptions and dispatch events within the React tree.

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
  const chats = useSubscription("chats")
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

const MyComponent = () => {
  const dispatch = useDispatch()
  return (
    <button onClick={() => dispatch({id: "my-event"})}>
      Click me to trigger "my-event"
    </button>
  )
}
```

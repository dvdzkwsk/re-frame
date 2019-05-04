So you want to start building an ultra-modern Todo application? Great. You'll probably want to begin by figuring out what sort of data your application needs. We'll give this data a name: **state**.

```js
state = {
  todos: ["Open docs", "Read the docs", "Build something"],
}
```

Modeling your application in this way gives you a sturdy foundation to build on. You can use it to visualize various states just by playing around with the data — all without writing even a single line of code. Looking at our example, we can already see something was missed: a way to mark todos as complete. Let's try again:

```js
state = {
  todos: [
    {title: "Open docs", completed: false},
    {title: "Read the docs", completed: false},
    {title: "Build something", completed: false},
  ],
}
```

You may have other ideas, but this will do fine. You've already opened some docs, so that todo should definitely be complete. Let's tell the application about it and get you the credit you deserve:

```
"Hey computer, I completed 'Open docs'"
```

... Silence. You definitely had the right idea there, though. You told the computer that something happened and expected it to do the right thing. There's even a fancy term for what you just did: declarative programming, and it can be a great way to model systems [[1]](#1).

So now you may be asking: how do I get the computer to understand me? You can't just go on yelling at it, after all. Well, we can take what was good about our original idea and expand on it. We want to continue to tell the computer that something happened in the world, but we need to be more specific about it — we can send the system messages so long as it knows what types of messages it will receive and what to do when they arrive.

Let's model that, sort of like we did with **state**. We want to send the system a message that a todo was completed, so we'll start there:

```js
message = "completed-todo"
```

That's a start, but an incomplete one. Just like mailing a letter, your recipient won't know what was going on when you sent the card, so the computer wouldn't know that you had just opened the docs. For this reason, it's important to make sure you include everything they need to make sense of the message. To remedy this, let's, quite literally, box up all the information a recipient needs:

```js
message = ["completed-todo", "Open docs"]
```

Much better! If we were to somehow send this message off, nothing would happen. Your application doesn't yet know what to do with messages, let alone "completed" messages that have something to do with "todos".

```js
context("user", () => ({ user: adal.user }))
event("completed-todo", [debug, inject('user')], function markTodoAsComplete(ctx, msg) {
  return {
    db: {
      ...ctx.state,
      todos: ctx.state.todos.find(...).completed = true
    },
    http: {
      url: '/todos',
      method: 'PATCH',
      success: 'completed-todo-success',
      failure: 'completed-todo-failure',
      ...
    },
  }
});
```

---

- <strong id="1">1</strong> For example, you didn't say "Hey computer, go find the 'Open docs' todo inside the array of todos and change its 'completed' property to 'true'". That would be _insane_ — of course nobody would do that.

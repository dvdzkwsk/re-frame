import test from "ava"
import {createStore} from "@re-frame/store"

const flush = () => new Promise(resolve => setTimeout(resolve))

const makeTodo = description => ({
  description,
  completed: false,
})
const [
  TODO_LEARN_REFRAME,
  TODO_WRITE_FIRST_REFRAME_APPLICATION,
  TODO_TAKE_A_BREAK,
] = [
  makeTodo("Learn about re-frame's dominos"),
  makeTodo("Write your first application with re-frame"),
  makeTodo("Take a break and go outside!"),
]

const makeStore = () => {
  const store = createStore()
  store.registerEventDB("init", () => ({
    todos: [
      TODO_LEARN_REFRAME,
      TODO_WRITE_FIRST_REFRAME_APPLICATION,
      TODO_TAKE_A_BREAK,
    ],
  }))
  store.dispatchSync(["init"])

  store.registerEventDB("toggle-completed", (db, [_, {description}]) => ({
    ...db,
    todos: db.todos.map(todo => {
      return todo.description === description
        ? {...todo, completed: !todo.completed}
        : todo
    }),
  }))

  store.registerEventDB("create-todo-success", (db, [_, todo]) => ({
    ...db,
    todos: db.todos.concat(todo),
  }))

  store.registerEventFX("create-todo", (cofx, [_, json]) => ({
    http: {
      method: "POST",
      url: "/create-todo",
      body: json,
      success: "create-todo-success",
    },
  }))

  store.registerEffect("http", store => config => {
    // simulate a network request
    Promise.resolve().then(() => {
      switch (config.url) {
        case "/create-todo":
          store.dispatchSync([config.success, config.body])
          break
      }
    })
  })

  return store
}

test("Can toggle a todo between complete and incomplete", t => {
  const store = makeStore()
  store.computed("todo", (db, [id, todo]) => {
    return db.todos.find(td => td.description === todo.description)
  })

  const findTodo = todo => store.query(["todo", todo])

  store.dispatchSync(["toggle-completed", TODO_LEARN_REFRAME])
  t.is(findTodo(TODO_LEARN_REFRAME).completed, true)

  store.dispatchSync(["toggle-completed", TODO_LEARN_REFRAME])
  t.is(findTodo(TODO_LEARN_REFRAME).completed, false)

  store.dispatchSync(["toggle-completed", TODO_LEARN_REFRAME])
  t.is(findTodo(TODO_LEARN_REFRAME).completed, true)
})

test("Can create a todo", async t => {
  const store = makeStore()

  store.computed("todos", db => db.todos)
  const todos = store.subscribe(["todos"])

  store.dispatchSync([
    "create-todo",
    {
      description: "Create a new todo",
      completed: false,
    },
  ])
  await flush()
  t.deepEqual(todos.deref(), [
    TODO_LEARN_REFRAME,
    TODO_WRITE_FIRST_REFRAME_APPLICATION,
    TODO_TAKE_A_BREAK,
    {
      description: "Create a new todo",
      completed: false,
    },
  ])
})

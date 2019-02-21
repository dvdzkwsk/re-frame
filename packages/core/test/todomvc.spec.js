import test from 'ava'
import {createStore, path, payload} from '../lib/re-frame.js'
import {assoc} from '../lib/utilities.js'

const flush = ms => new Promise(resolve => setTimeout(resolve))

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
  makeTodo('Write your first application with re-frame'),
  makeTodo('Take a break and go outside!'),
]

const makeStore = () => {
  const store = createStore({
    todos: [
      TODO_LEARN_REFRAME,
      TODO_WRITE_FIRST_REFRAME_APPLICATION,
      TODO_TAKE_A_BREAK,
    ],
  })

  store.registerEventDB(
    'toggle-completed',
    [path('todos'), payload],
    (todos, {description}) =>
      todos.map(todo => {
        return todo.description === description
          ? assoc(todo, ['completed'], !todo.completed)
          : todo
      })
  )

  store.registerEventDB(
    'create-todo-success',
    [path('todos'), payload],
    (todos, todo) => todos.concat(todo)
  )

  store.registerEventFX('create-todo', [payload], (cofx, json) => ({
    http: {
      method: 'POST',
      url: '/create-todo',
      body: json,
      success: 'create-todo-success',
    },
  }))

  store.registerEffect('http', config => {
    // simulate a network request
    Promise.resolve().then(() => {
      switch (config.url) {
        case '/create-todo':
          store.dispatchSync([config.success, config.body])
          break
      }
    })
  })

  return store
}

test('Can toggle a todo between complete and incomplete', t => {
  const store = makeStore()
  store.registerSubscription('todo', (db, [id, todo]) => {
    return db.todos.find(td => td.description === todo.description)
  })

  const findTodo = todo => {
    const atom = store.subscribe(['todo', todo])
    const value = atom.deref()
    atom._dispose()
    return value
  }

  store.dispatchSync(['toggle-completed', TODO_LEARN_REFRAME])
  t.is(findTodo(TODO_LEARN_REFRAME).completed, true)

  store.dispatchSync(['toggle-completed', TODO_LEARN_REFRAME])
  t.is(findTodo(TODO_LEARN_REFRAME).completed, false)

  store.dispatchSync(['toggle-completed', TODO_LEARN_REFRAME])
  t.is(findTodo(TODO_LEARN_REFRAME).completed, true)
})

test('Can create a todo', async t => {
  const store = makeStore()

  store.registerSubscription('todos', db => db.todos)
  const todos = store.subscribe(['todos'])

  store.dispatchSync([
    'create-todo',
    {
      description: 'Create a new todo',
      completed: false,
    },
  ])
  await flush()
  const todo = todos
    .deref()
    .find(todo => todo.description === 'Create a new todo')

  t.is(todos.deref().length, 4)
  t.deepEqual(todo, {
    description: 'Create a new todo',
    completed: false,
  })
})

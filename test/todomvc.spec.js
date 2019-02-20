import test from 'ava'
import {createStore, path, payload} from '../lib/re-frame.js'
import {assoc} from '../lib/utilities.js'

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

  return store
}

test('Can toggle a todo between complete and incomplete', async t => {
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

  store.dispatch(['toggle-completed', TODO_LEARN_REFRAME])
  await flush()
  t.is(findTodo(TODO_LEARN_REFRAME).completed, true)

  store.dispatch(['toggle-completed', TODO_LEARN_REFRAME])
  await flush()
  t.is(findTodo(TODO_LEARN_REFRAME).completed, false)

  store.dispatch(['toggle-completed', TODO_LEARN_REFRAME])
  await flush()
  t.is(findTodo(TODO_LEARN_REFRAME).completed, true)
})

import test from "ava"
import {atom} from "../lib/atom.js"

test("deref > returns the current value inside the atom", t => {
  const a = atom("hello")
  t.is(a.deref(), "hello")
})

test("watch > is called whenever the atom changes", t => {
  const history = []
  const a = atom("hello")
  const unwatch = a.watch(val => history.push(val))

  a.reset("world")
  t.deepEqual(history, ["world"])

  a.swap(val => val.toUpperCase())
  t.deepEqual(history, ["world", "WORLD"])

  unwatch()
})

test("watch > returns a function to remove the watcher", t => {
  const history = []
  const a = atom("hello")
  const unwatch = a.watch(val => history.push(val))

  a.reset("world")
  t.is(history.length, 1)

  unwatch()
  a.reset("world")
  t.is(history.length, 1)
})

test("watch > disposing a watcher more than once is a noop", t => {
  let calls = 0
  const a = atom("hello")
  const dispose1 = a.watch(() => calls++)
  const dispose2 = a.watch(() => calls++)

  a.reset(1)
  t.is(calls, 2)

  dispose1()
  dispose1()

  calls = 0
  a.reset(2)
  t.is(calls, 1)

  a.dispose()
})

test("reset > updates the value inside the atom to be the provided value", t => {
  const a = atom("hello")

  t.is(a.deref(), "hello")
  a.reset("world")
  t.is(a.deref(), "world")
})

test("swap > updates the value inside the atom to the result of the swap function", t => {
  const a = atom("hello")

  a.swap(val => val.toUpperCase())
  t.is(a.deref(), "HELLO")
})

test("dispose > releases all watchers and the current value", t => {
  let calls = 0
  const a = atom("hello")
  a.watch(() => calls++)

  a.reset(1)
  t.is(calls, 1)

  calls = 0
  a.dispose()
  t.is(a.deref(), undefined)
  a.reset(1)
  t.is(calls, 0)
})

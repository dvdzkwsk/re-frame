import test from 'ava'
import {createAtom} from '../lib/create-atom.js'

test('deref > returns the current value inside the atom', t => {
  const atom = createAtom('hello')
  t.is(atom.deref(), 'hello')
})

test('watch > is called whenever the atom changes', t => {
  const calls = []
  const atom = createAtom('hello')
  const unwatch = atom.watch((...args) => calls.push(args))

  atom.reset('world')
  t.deepEqual(calls, [['hello', 'world']])

  atom.swap(val => val.toUpperCase())
  t.deepEqual(calls, [['hello', 'world'], ['world', 'WORLD']])

  unwatch()
})

test('watch > returns a function to remove the watcher', t => {
  const calls = []
  const atom = createAtom('hello')
  const unwatch = atom.watch((...args) => calls.push(args))

  atom.reset('world')
  t.is(calls.length, 1)

  unwatch()
  atom.reset('world')
  t.is(calls.length, 1)
})

test('reset > updates the value inside the atom to be the provided value', t => {
  const atom = createAtom('hello')
  t.is(atom.deref(), 'hello')
  atom.reset('world')
  t.is(atom.deref(), 'world')
})

test('swap > updates the value inside the atom to the result of the swap function', t => {
  const atom = createAtom('hello')
  atom.swap(val => val.toUpperCase())
  t.is(atom.deref(), 'HELLO')
})

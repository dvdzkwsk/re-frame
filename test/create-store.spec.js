import test from 'ava'
import * as reframe from '../lib/index.js'

test('accepts an optional initial state', t => {
  t.plan(1)

  const initialState = {foo: 'bar'}
  const store = reframe.createStore(initialState)
  store.registerEventDB('expect', (db, [_, value]) => t.is(db, value))
  store.dispatch(['expect', initialState])
})

// test('Uses result of EventDB handler to update DB state', t => {
//   t.plan(4)

//   const store = reframe.createStore(1)
//   store.registerEventDB('expect', (db, [_, value]) => t.is(db, value))
//   store.registerEventDB('double', db => {
//     console.log('call double!', db * 2)
//     return db * 2
//   })

//   store.dispatch(['expect', 1])
//   store.dispatch(['double'])
//   store.dispatch(['expect', 2])
//   // store.dispatch(['double'])
//   // store.dispatch(['expect', 4])
//   // store.dispatch(['double'])
//   // store.dispatch(['expect', 8])
// })

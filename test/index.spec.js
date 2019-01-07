import test from 'ava'
import * as reframe from '../lib/index.js'
import {validateInterceptors} from '../lib/interceptors.js'

test('exports `createStore`', t => {
  const store = reframe.createStore()
  t.is(typeof store.dispatch, 'function', 'store.dispatch is a function')
  t.is(
    typeof store.registerEventDB,
    'function',
    'store.registerEventDB is exported as a function'
  )
  t.is(
    typeof store.registerEventFX,
    'function',
    'store.registerEventFX is exported as a function'
  )
  t.is(
    typeof store.registerCoeffect,
    'function',
    'store.registerCoeffect is exported as a function'
  )
  t.is(
    typeof store.registerEffect,
    'function',
    'store.registerEffect is exported as a function'
  )
  t.is(
    typeof store.snapshot,
    'function',
    'store.snapshot is exported as a function'
  )
  t.is(
    typeof store.injectCoeffect,
    'function',
    'store.injectCoeffect is exported as a function'
  )
})

test('exports `path` interceptor', t => {
  validateInterceptors([reframe.path(['foo'])])
  t.pass()
})

test('exports `payload` interceptor', t => {
  validateInterceptors([reframe.payload])
  t.pass()
})

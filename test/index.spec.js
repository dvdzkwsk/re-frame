import test from 'ava'
import * as reframe from '../lib/index.js'
import {validateInterceptors} from '../lib/interceptors.js'

test('exports a global store', t => {
  t.is(typeof reframe.dispatch, 'function', 'reframe.dispatch is a function')
  t.is(
    typeof reframe.registerEventDB,
    'function',
    'reframe.registerEventDB is exported as a function'
  )
  t.is(
    typeof reframe.registerEventFX,
    'function',
    'reframe.registerEventFX is exported as a function'
  )
  t.is(
    typeof reframe.registerCoeffect,
    'function',
    'store.registerCoeffect is exported as a function'
  )
  t.is(
    typeof reframe.snapshot,
    'function',
    'store.snapshot is exported as a function'
  )
})

test('exports `createStore`', t => {
  t.is(typeof reframe.createStore, 'function')
})

test('exports `path` interceptor', t => {
  validateInterceptors([reframe.path(['foo'])])
  t.pass()
})

test('exports `payload` interceptor', t => {
  validateInterceptors([reframe.payload])
  t.pass()
})

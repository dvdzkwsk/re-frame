import test from 'ava'
import * as reframe from '../lib/standalone.js'

test('exports "createStore"', t => {
  t.is(typeof reframe.createStore, 'function')
})

test('exports "path" interceptor', t => {
  t.is(typeof reframe.path, 'function')
})

test('exports "payload" interceptor', t => {
  t.is(typeof reframe.payload, 'object')
})

test('exports "immer" interceptor', t => {
  t.is(typeof reframe.immer, 'object')
})

test('exports "orchestrate" effect', t => {
  t.is(typeof reframe.orchestrate, 'function')
})

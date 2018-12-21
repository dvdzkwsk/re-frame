import test from 'ava'
import * as reframe from '../lib/index.js'

test('exports a global store', t => {
  t.is(typeof reframe.dispatch, 'function', 'reframe.dispatch is a function')
  t.is(
    typeof reframe.registerEventDB,
    'function',
    'reframe.registerEventDB is exported as a function',
  )
  t.is(
    typeof reframe.registerEventFX,
    'function',
    'reframe.registerEventFX is exported as a function',
  )
  t.is(
    typeof reframe.registerCoeffect,
    'function',
    'store.registerCoeffect is exported as a function',
  )
  t.is(
    typeof reframe.snapshot,
    'function',
    'store.snapshot is exported as a function',
  )
})

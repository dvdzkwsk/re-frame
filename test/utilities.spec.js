import test from 'ava'
import {flatten} from '../lib/utilities.js'

test('deeply flattens a nested array', t => {
  const expected = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  t.deepEqual(flatten([1, [2, [3, [4, 5, 6]]], 7, 8, [9, 10]]), expected)
})

test('removes falsy values', t => {
  const expected = [1, 2, 3]
  t.deepEqual(
    flatten([0, false, 1, [null, [], 2, [undefined, void 0, 3]]]),
    expected,
  )
})

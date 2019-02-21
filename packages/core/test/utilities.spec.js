import test from 'ava'
import {flatten, shallowClone, assoc, getPath} from '../lib/utilities.js'

test('flatten > deeply flattens a nested array', t => {
  const expected = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  t.deepEqual(flatten([1, [2, [3, [4, 5, 6]]], 7, 8, [9, 10]]), expected)
})

test('flatten > retains falsy values', t => {
  const expected = [0, false, 1, null, 2, undefined, void 0, 3]
  t.deepEqual(
    flatten([0, false, 1, [null, [], 2, [undefined, void 0, 3]]]),
    expected
  )
})

test('shallowClone > returns a shallow clone of the supplied object', t => {
  const obj = {
    a: {
      b: 'c',
    },
  }
  const cloned = shallowClone(obj)
  t.not(obj, cloned) // references should be difference
  t.deepEqual(obj, cloned) // structure should be the same
  t.is(obj.a, cloned.a) // deep objects should not be cloned
})

test('assoc > returns a new object with the value updated at `path`', t => {
  const obj = {
    a: {
      b: {
        c: 1,
      },
    },
  }
  const res = assoc(obj, ['a', 'b', 'c'], 2)
  t.deepEqual(res, {
    a: {
      b: {
        c: 2,
      },
    },
  })
  // original object should not be mutated
  t.deepEqual(obj, {
    a: {
      b: {
        c: 1,
      },
    },
  })
})

test('assoc > creates new objects as needed while traversing `path`', t => {
  const obj = {}
  const res = assoc(obj, ['a', 'b', 'c'], 2)
  t.deepEqual(res, {
    a: {
      b: {
        c: 2,
      },
    },
  })
})

test('getPath > return the value at `path`', t => {
  t.is(
    getPath(
      {
        a: {
          b: {
            c: 2,
          },
        },
      },
      ['a', 'b', 'c']
    ),
    2
  )
})

test('getPath > return undefined if `path` does not exist in the target', t => {
  t.is(getPath({}, ['a', 'b', 'c']), undefined)
})

test('getPath > allows undefined input objects', t => {
  t.is(getPath(null, ['a', 'b', 'c']), undefined)
})

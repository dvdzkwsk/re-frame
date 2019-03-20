import test from "ava"
import {flatten, shallowClone, assoc} from "../lib/utils.js"

test("shallowClone > returns a shallow clone of the supplied object", t => {
  const obj = {
    a: {
      b: "c",
    },
  }
  const cloned = shallowClone(obj)
  t.not(obj, cloned) // references should be difference
  t.deepEqual(obj, cloned) // structure should be the same
  t.is(obj.a, cloned.a) // deep objects should not be cloned
})

test("assoc > returns a new object with the value updated at `path`", t => {
  const obj = {
    a: {
      b: {
        c: 1,
      },
    },
  }
  const res = assoc(obj, ["a", "b", "c"], 2)
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

test("assoc > creates new objects as needed while traversing `path`", t => {
  const obj = {}
  const res = assoc(obj, ["a", "b", "c"], 2)
  t.deepEqual(res, {
    a: {
      b: {
        c: 2,
      },
    },
  })
})

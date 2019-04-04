import test from "ava"
import {shallowClone, assoc, get} from "../lib/utils.js"

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

test("assoc > immutably updates the value updated at `path`", t => {
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

test("get > returns the value at `path`", t => {
  const obj = {
    a: {
      b: {
        c: 1,
      },
    },
  }
  t.is(get(obj, ["a", "b", "c"]), 1)
})

test("get > returns undefined if an intermediary key does not exist", t => {
  const obj = {
    a: {},
  }
  t.is(get(obj, ["a", "b", "c"]), undefined)
})

test("get > returns falsy values at end of `path` (i.e. does not return `undefined`)", t => {
  const obj = {
    a: {
      b: {
        c: false,
      },
    },
  }
  t.is(get(obj, ["a", "b", "c"]), false)
})

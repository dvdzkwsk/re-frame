import test from "ava"
import {immer} from "../lib/immer.js"
import {
  runInterceptorQueue,
  switchDirections,
} from "@re-frame/store/lib/interceptors"

function createContext(context) {
  return Object.assign(
    {
      stack: [],
      queue: [],
      effects: {},
      coeffects: {},
    },
    context
  )
}

function runInterceptors(context, direction) {
  context = runInterceptorQueue(context, direction)
  delete context.queue
  delete context.stack
  return context
}

test("immer > applies normal-looking mutations to db without actually mutating it", t => {
  const db = {
    foo: {
      bar: {
        baz: "original",
      },
    },
  }
  let context = createContext({
    queue: [
      immer,
      {
        id: "uppercase",
        before(context) {
          const db = context.coeffects.db
          db.foo.bar.baz = "changed"
          return {
            ...context,
            effects: {
              ...context.effects,
              db,
            },
          }
        },
      },
    ],
    coeffects: {
      db,
    },
  })
  context = runInterceptorQueue(context, "before")
  context = switchDirections(context)
  context = runInterceptors(context, "after")

  // object references should be broken
  t.not(db, context.effects.db)
  t.not(db.foo, context.effects.db.foo)
  t.not(db.foo.bar, context.effects.db.foo.bar)

  // old object should not have been mutated
  t.deepEqual(db, {
    foo: {
      bar: {
        baz: "original",
      },
    },
  })

  // new db should have applied the mutations
  t.deepEqual(context.effects.db, {
    foo: {
      bar: {
        baz: "changed",
      },
    },
  })
})

test("immer > does not require the db to be returned as an effect", t => {
  const db = {
    foo: {
      bar: {
        baz: "original",
      },
    },
  }
  let context = createContext({
    queue: [
      immer,
      {
        id: "uppercase",
        before(context) {
          const db = context.coeffects.db
          db.foo.bar.baz = "changed"
          return {
            ...context,
            effects: {},
          }
        },
      },
    ],
    coeffects: {
      db,
    },
  })
  context = runInterceptorQueue(context, "before")
  context = switchDirections(context)
  context = runInterceptors(context, "after")

  // new db should have applied the mutations
  t.deepEqual(context.effects.db, {
    foo: {
      bar: {
        baz: "changed",
      },
    },
  })
})

import test from "ava"
import {immer} from "../lib/immer.js"

function createContext(context) {
  return {
    stack: [],
    queue: [],
    effects: {},
    coeffects: {},
    ...context,
  }
}

function runInterceptors(context) {
  context = runInterceptorQueue(context, "before")
  context = switchDirections(context)
  context = runInterceptorQueue(context, "after")
  delete context.queue
  delete context.stack
  return context
}

function runInterceptorQueue(context, direction) {
  while (context.queue.length) {
    var interceptor = context.queue[0]
    context = {...context}
    context.queue = context.queue.slice(1)
    context.stack = [interceptor].concat(context.stack)
    if (interceptor[direction]) {
      context = interceptor[direction](context)
    }
  }
  return context
}

function switchDirections(context) {
  context = {...context}
  context.queue = context.stack
  context.stack = []
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
  context = runInterceptors(context)

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
  context = runInterceptors(context)

  // new db should have applied the mutations
  t.deepEqual(context.effects.db, {
    foo: {
      bar: {
        baz: "changed",
      },
    },
  })
})

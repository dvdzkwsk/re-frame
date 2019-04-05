import test from "ava"
import {path, payload, enrich, validateDB} from "../lib/interceptors.js"

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

test("payload > strips 'id' from the event", t => {
  let beforeContext
  const contextSpy = {
    id: "context-spy",
    before(context) {
      beforeContext = context
      return context
    },
  }

  let context = createContext({
    queue: [payload, contextSpy],
    effects: {},
    coeffects: {
      event: ["add", 5, 6, 7],
    },
  })
  runInterceptors(context)
  t.deepEqual(beforeContext.coeffects.event, [5, 6, 7])
})

test("payload > restores the original event in its 'after' phase", t => {
  let beforeContext
  let afterContext
  const contextSpy = {
    id: "context-spy",
    before(context) {
      beforeContext = context
      return context
    },
    after(context) {
      afterContext = context
      return context
    },
  }

  let context = createContext({
    queue: [contextSpy, payload],
    effects: {},
    coeffects: {
      event: ["add", 5],
    },
  })
  context = runInterceptors(context)
  t.deepEqual(beforeContext.coeffects.event, ["add", 5])
  t.deepEqual(afterContext.coeffects.event, ["add", 5])
})

test("path > updates `coeffects.db` to be the value of `db` at `path`", t => {
  let context = createContext({
    queue: [path(["foo", "bar", "baz"])],
    effects: {},
    coeffects: {
      db: {
        foo: {
          bar: {
            baz: "value-at-path",
          },
        },
      },
    },
  })
  context = runInterceptors(context)
  t.is(context.coeffects.db, "value-at-path")
})

test("path > applies the updated db value to the original DB at `path`", t => {
  let context = createContext({
    queue: [
      path(["foo", "bar", "baz"]),
      {
        id: "uppercase",
        after(context) {
          return {
            ...context,
            effects: {
              db: context.coeffects.db.toUpperCase(),
            },
          }
        },
      },
    ],
    coeffects: {
      db: {
        foo: {
          bar: {
            baz: "value-at-path",
          },
        },
      },
    },
  })
  context = runInterceptors(context)
  t.deepEqual(context, {
    coeffects: {
      db: "value-at-path",
      _originalDB: {
        foo: {
          bar: {
            baz: "value-at-path",
          },
        },
      },
    },
    effects: {
      db: {
        foo: {
          bar: {
            baz: "VALUE-AT-PATH",
          },
        },
      },
    },
  })
})

test("path > does not apply path to produce 'db' effect if no other interceptor affected 'db'", t => {
  let context = createContext({
    queue: [
      path(["foo", "bar", "baz"]),
      {
        id: "uppercase",
        after(context) {
          return {
            ...context,
            effects: {}, // no "db" effect
          }
        },
      },
    ],
    coeffects: {
      db: {
        foo: {
          bar: {
            baz: "value-at-path",
          },
        },
      },
    },
  })
  context = runInterceptors(context)
  t.deepEqual(context, {
    coeffects: {
      db: "value-at-path",
      _originalDB: {
        foo: {
          bar: {
            baz: "value-at-path",
          },
        },
      },
    },
    effects: {},
  })
})

test("validateDB > when the predicate fails, all effects are discarded", t => {
  const error = console.error
  let errors = []
  console.error = (...args) => errors.push(args)

  let context = createContext({
    queue: [validateDB(db => typeof db.count === "number")],
    coeffects: {
      event: ["bad-event"],
      db: {
        count: 1,
      },
    },
    effects: {
      db: {
        count: undefined,
      },
    },
  })
  context = runInterceptors(context)
  t.deepEqual(errors, [
    [
      'Event "bad-event" produced an invalid value for "db". Compare "before" and "after" for details.',
      {
        before: {count: 1},
        after: {count: undefined},
      },
    ],
  ])
  t.deepEqual(context.effects, {})
  console.error = error
})

test('enrich > applies "fn" to "db" effect', t => {
  let context = createContext({
    queue: [enrich(db => ({count: db.count * 2}))],
    effects: {
      db: {
        count: 1,
      },
    },
    coeffects: {
      event: ["noop"],
    },
  })
  context = runInterceptors(context)
  t.deepEqual(context.effects, {
    db: {
      count: 2,
    },
  })
})

test('enrich > is ignored if "db" effect does not exist', t => {
  let context = createContext({
    queue: [enrich(db => db.count * 2)],
    coeffects: {
      db: {
        count: 1,
      },
      event: ["noop"],
    },
  })
  context = runInterceptors(context)
  t.deepEqual(context.effects, {})
})

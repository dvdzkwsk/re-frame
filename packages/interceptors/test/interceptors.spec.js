import test from "ava"
import {
  after,
  path,
  payload,
  enrich,
  immer,
  validateDB,
} from "../lib/interceptors.js"

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
  let event
  const eventSpy = {
    id: "context-spy",
    before(context) {
      event = context.coeffects.event
      return context
    },
  }

  let context = createContext({
    queue: [payload, eventSpy],
    effects: {},
    coeffects: {
      event: ["add", 5, 6, 7],
    },
  })
  runInterceptors(context)
  t.deepEqual(event, [5, 6, 7])
})

test("payload > restores the original event in its 'after' phase", t => {
  let beforeEvent
  let afterEvent
  const eventSpy = {
    id: "context-spy",
    before(context) {
      beforeEvent = context.coeffects.event
      return context
    },
    after(context) {
      afterEvent = context.coeffects.event
      return context
    },
  }

  let context = createContext({
    queue: [eventSpy, payload],
    effects: {},
    coeffects: {
      event: ["add", 5],
    },
  })
  context = runInterceptors(context)
  t.deepEqual(beforeEvent, ["add", 5])
  t.deepEqual(afterEvent, ["add", 5])
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

test('after > runs "fn" as a side-effect against "db" effect', t => {
  const calls = []
  const fn = (...args) => calls.push(args)
  let context = createContext({
    queue: [after(fn)],
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
  t.deepEqual(calls, [[{count: 1}, ["noop"]]])
})

test('after > is ignored if "db" effect does not exist', t => {
  const calls = []
  const fn = (...args) => calls.push(args)
  let context = createContext({
    queue: [after(fn)],
    effects: {},
    coeffects: {
      event: ["noop"],
    },
  })
  context = runInterceptors(context)
  t.deepEqual(calls, [])
})

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

test("immer > does not throw if no db exists", t => {
  const db = undefined
  let context = createContext({
    queue: [immer],
    coeffects: {
      db,
    },
  })

  t.notThrows(() => {
    context = runInterceptors(context)
  })
})

import test from "ava"
import {
  assertValidInterceptors,
  dbHandlerToInterceptor,
  fxHandlerToInterceptor,
  runInterceptorQueue,
} from "../lib/interceptors.js"

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

function runAndStripInterceptors(context, direction) {
  context = runInterceptorQueue(context, direction)
  delete context.queue
  delete context.stack
  return context
}

test("dbHandlerToInterceptor > applies the result of `handler(db, event)` to ctx.effects.db", t => {
  let context = createContext({
    coeffects: {
      db: 1,
    },
    queue: [
      dbHandlerToInterceptor(db => {
        return db * 2
      }),
    ],
  })
  context = runAndStripInterceptors(context, "before")
  t.deepEqual(context, {
    coeffects: {
      db: 1,
    },
    effects: {
      db: 2,
    },
  })
})

test("fxHandlerToInterceptor > applies the result of `handler(cofx, event)` to ctx.effects", t => {
  let context = createContext({
    coeffects: {
      db: 1,
    },
    queue: [
      fxHandlerToInterceptor((cofx, event) => {
        return {
          db: cofx.db * 2,
          effectA: 1,
          effectB: 2,
        }
      }),
    ],
  })
  context = runAndStripInterceptors(context, "before")
  t.deepEqual(context, {
    coeffects: {
      db: 1,
    },
    effects: {
      db: 2,
      effectA: 1,
      effectB: 2,
    },
  })
})

test("assertValidInterceptors > does not throw for valid interceptors", t => {
  const validInterceptors = [
    {id: "foo", before() {}, after() {}},
    {id: "foo", before() {}},
    {id: "foo", after() {}},
  ]
  validInterceptors.forEach(interceptor => {
    assertValidInterceptors([interceptor])
  })
  t.pass()
})

test("assertValidInterceptors > throws for invalid interceptors", t => {
  const invalidInterceptors = [
    [
      null,
      "Interceptor at index 0 was undefined. Check for spelling mistakes or missing imports.",
    ],
    [
      () => {},
      "Interceptor at index 0 was a function. This likely means you forgot to call the function in order to create the interceptor.",
    ],
    [
      2,
      "Interceptor at index 0 was an invalid type. Received number when it should be an object.",
    ],
    [{}, 'Interceptor at index 0 was missing an "id" key.'],
    [
      {id: "foo"},
      'Interceptor with id "foo" was missing a "before" or "after" hook. At least one is required.',
    ],
    [
      {id: "foo", before: {}},
      'Interceptor with id "foo" had a "before" hook but its value was not a function.',
    ],
    [
      {id: "foo", after: {}},
      'Interceptor with id "foo" had an "after" hook but its value was not a function.',
    ],
  ]

  invalidInterceptors.forEach(([interceptor, expectedError]) => {
    t.throws(() => assertValidInterceptors([interceptor], ""), expectedError)
  })
})

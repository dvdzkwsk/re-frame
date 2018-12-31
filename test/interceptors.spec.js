import test from 'ava'
import {
  path,
  payload,
  dbHandlerToInterceptor,
  fxHandlerToInterceptor,
  runInterceptors,
  switchDirections,
} from '../lib/interceptors.js'

function runAndStripInterceptors(context, direction) {
  context = runInterceptors(context, direction)
  delete context.queue
  delete context.stack
  return context
}

test('dbHandlerToInterceptor > applies the result of `handler(db, event)` to ctx.effects.db', t => {
  let context = {
    coeffects: {
      db: 1,
    },
    queue: [
      dbHandlerToInterceptor(db => {
        return db * 2
      }),
    ],
  }
  context = runAndStripInterceptors(context, 'before')
  t.deepEqual(context, {
    coeffects: {
      db: 1,
    },
    effects: {
      db: 2,
    },
  })
})

test('fxHandlerToInterceptor > applies the result of `handler(cofx, event)` to ctx.effects', t => {
  let context = {
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
  }
  context = runAndStripInterceptors(context, 'before')
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

test('path > updates `coeffects.db` to be the value of `db` at `path`', t => {
  let context = {
    queue: [path(['foo', 'bar', 'baz'])],
    coeffects: {
      db: {
        foo: {
          bar: {
            baz: 'bop',
          },
        },
      },
    },
  }
  context = runAndStripInterceptors(context, 'before')
  t.deepEqual(context, {
    coeffects: {
      db: 'bop',
      _originalDB: {
        foo: {
          bar: {
            baz: 'bop',
          },
        },
      },
    },
  })
})

test('path > applies the updated db value to the original DB at `path`', t => {
  let context = {
    queue: [
      path(['foo', 'bar', 'baz']),
      dbHandlerToInterceptor(db => db.toUpperCase()),
    ],
    coeffects: {
      db: {
        foo: {
          bar: {
            baz: 'bop',
          },
        },
      },
    },
  }
  context = runInterceptors(context, 'before')
  context = switchDirections(context)
  context = runAndStripInterceptors(context, 'after')
  t.deepEqual(context, {
    coeffects: {
      db: 'bop',
      _originalDB: {
        foo: {
          bar: {
            baz: 'bop',
          },
        },
      },
    },
    effects: {
      db: {
        foo: {
          bar: {
            baz: 'BOP',
          },
        },
      },
    },
  })
})

test('payload > replaces the event tuple with just its payload', t => {
  let context = {
    queue: [payload],
    coeffects: {
      event: ['add', 5],
    },
  }
  context = runAndStripInterceptors(context, 'before')
  t.deepEqual(context, {
    coeffects: {
      event: 5,
    },
  })
})

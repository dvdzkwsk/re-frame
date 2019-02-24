import test from 'ava'
import {path, payload} from '../lib/interceptors.js'
import {
  runInterceptorQueue,
  switchDirections,
} from '../../core/lib/interceptors'

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

test('payload > replaces the event tuple with just its payload', t => {
  let context = createContext({
    queue: [payload],
    effects: {},
    coeffects: {
      event: ['add', 5],
    },
  })
  context = runInterceptors(context, 'before')
  t.deepEqual(context, {
    effects: {},
    coeffects: {
      event: 5,
    },
  })
})

test('path > updates `coeffects.db` to be the value of `db` at `path`', t => {
  let context = createContext({
    queue: [path(['foo', 'bar', 'baz'])],
    effects: {},
    coeffects: {
      db: {
        foo: {
          bar: {
            baz: 'bop',
          },
        },
      },
    },
  })
  context = runInterceptors(context, 'before')
  t.deepEqual(context, {
    effects: {},
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
  let context = createContext({
    queue: [
      path(['foo', 'bar', 'baz']),
      {
        id: 'uppercase',
        before(context) {
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
            baz: 'bop',
          },
        },
      },
    },
  })
  context = runInterceptorQueue(context, 'before')
  context = switchDirections(context)
  context = runInterceptors(context, 'after')
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

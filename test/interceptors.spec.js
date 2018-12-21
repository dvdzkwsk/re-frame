import test from 'ava'
import {
  dbHandlerToInterceptor,
  fxHandlerToInterceptor,
} from '../lib/interceptors.js'

test('dbHandlerToInterceptor > applies the result of `handler(db, event)` to ctx.effects.db', t => {
  const interceptor = dbHandlerToInterceptor(db => {
    return db * 2
  })
  const context = interceptor.before({
    coeffects: {
      db: 1,
    },
  })
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
  const interceptor = fxHandlerToInterceptor((cofx, event) => {
    return {
      db: cofx.db * 2,
      effectA: 1,
      effectB: 2,
    }
  })
  const context = interceptor.before({
    coeffects: {
      db: 1,
    },
  })
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

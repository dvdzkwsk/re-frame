import {assoc, assocPath, getPath, shallowClone} from './utilities.js'

/**
 * A DB handler receives the current db and event and return the new db state.
 * This interceptor wraps that handler so that its return value is
 * automatically applied to the "db" effect.
 *
 * @param {(db, event) => db} handler - DB event handler
 * @returns {Interceptor}
 */
export function dbHandlerToInterceptor(handler) {
  return {
    id: 'db-handler',
    before: function before(context) {
      var db = context.coeffects.db
      var event = context.coeffects.event
      return assocPath(context, ['effects', 'db'], handler(db, event))
    },
  }
}

/**
 * An FX handler takes coeffects and returns effects. This interceptor wraps
 * that handler so that its return value is applied to the `effects`
 * property on context.
 *
 * @param {(cofx, event) => effects} handler - FX event handler
 * @returns {Interceptor}
 */
export function fxHandlerToInterceptor(handler) {
  return {
    id: 'fx-handler',
    before: function before(context) {
      var coeffects = context.coeffects
      return assoc(context, 'effects', handler(coeffects, coeffects.event))
    },
  }
}

export function runInterceptors(context, direction) {
  while (context.queue.length) {
    var interceptor = context.queue[0]
    context = shallowClone(context)
    context.queue = context.queue.slice(1)
    context.stack = [interceptor].concat(context.stack)
    if (interceptor[direction]) {
      context = interceptor[direction](context)
    }
  }
  return context
}

export function path(path) {
  path = [].concat(path)
  return {
    id: 'path',
    before: function before(context) {
      // Preserve the original db so we can restore it after diving into `path`.
      var db = context.coeffects.db
      context = assocPath(context, ['coeffects', '_originalDB'], db)

      // `db` for all future interceptors is the value at `path`.
      return assocPath(context, ['coeffects', 'db'], getPath(db, path))
    },
    after: function after(context) {
      // Restore the original db and update its value at `path`.
      var db = assocPath(
        context.coeffects._originalDB,
        path,
        context.effects.db
      )
      return assocPath(context, ['effects', 'db'], db)
    },
  }
}

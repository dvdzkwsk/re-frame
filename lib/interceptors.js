import {assoc, assocPath, getPath, shallowClone} from './utilities.js'

// A DB handler receives the current db and event and return a new db.
// This interceptor wraps that handler so that its return value is
// automatically applied to the "db" effect.
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

// An FX handler takes coeffects and returns effects. Where a DB handler
// returns `effects.db`, this FX handler returns the entire `effects`
// object. This gives it a chance to do more  than just update the db.
export function fxHandlerToInterceptor(handler) {
  return {
    id: 'fx-handler',
    before: function before(context) {
      var coeffects = context.coeffects
      return assoc(context, 'effects', handler(coeffects, coeffects.event))
    },
  }
}

// Events are tuples that look like [id, payload]. Most event handlers don't
// care about the `id` of the event, though, and don't want to deal with
// unwrapping the event just to use the payload.
//
// This interceptor makes most event handlers more aesthetically pleasing
// by replacing the event tuple with just its payload.
//
// registerEventDB('add', (db, [_, arg]) => db + arg)
//
// Becomes:
//
// registerEventDB('add', [payload], (db, arg) => db + arg)
//                            |
//                            └────── interceptor
export var payload = {
  id: 'payload',
  before: function before(context) {
    return assocPath(
      context,
      ['coeffects', 'event'],
      context.coeffects.event[1]
    )
  },
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

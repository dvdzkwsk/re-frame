import {get, shallowClone, assoc} from "@re-frame/utils"

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
  id: "payload",
  before: function(context) {
    var event = context.coeffects.event

    context = shallowClone(context)
    context.coeffects = shallowClone(context.coeffects)
    context.coeffects.event = event.slice(1)
    context.coeffects._originalEvent = event
    return context
  },
  after: function(context) {
    context = shallowClone(context)
    context.coeffects = shallowClone(context.coeffects)
    context.coeffects.event = context.coeffects._originalEvent
    return context
  },
}

export function path(path) {
  return {
    id: "path",
    before: function(context) {
      // Preserve the original db so it can be restored after diving into "path".
      var db = context.coeffects.db
      context = shallowClone(context)
      context.coeffects = shallowClone(context.coeffects)
      context.coeffects._originalDB = db
      context.coeffects.db = get(db, path)
      return context
    },
    after: function(context) {
      if (!("db" in context.effects)) {
        return context
      }

      var origDB = context.coeffects._originalDB
      var nextDB = assoc(origDB, path, context.effects.db)
      return assoc(context, ["effects", "db"], nextDB)
    },
  }
}

export function validateDB(predicate) {
  return {
    id: "validate-db",
    after: function(context) {
      if (context.effects.db) {
        if (!predicate(context.effects.db)) {
          var eventId = context.coeffects.event[0]
          console.error(
            'Event "' +
              eventId +
              '" produced an invalid value for "db". Compare "before" and "after" for details.',
            {
              before: context.coeffects.db,
              after: context.effects.db,
            }
          )
          context = assoc(context, ["effects"], {})
          return context
        }
      }
      return context
    },
  }
}

export function enrich(fn) {
  return {
    id: "enrich",
    after: function(context) {
      if (!("db" in context.effects)) {
        return context
      }
      var db = fn(context.effects.db, context.coeffects.event)
      return assoc(context, ["effects", "db"], db)
    },
  }
}

export function after(fn) {
  return {
    id: "after",
    after: function(context) {
      if (!("db" in context.effects)) {
        return context
      }
      fn(context.effects.db, context.coeffects.event)
      return context
    },
  }
}

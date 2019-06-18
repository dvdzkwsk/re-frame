import {createDraft, finishDraft} from "immer"

// Events are tuples that look like [id, payload]. Most event handlers don't
// care about the `id` of the event. The payload interceptors strips the id
// out of the tuple to create more convenient event handlers.
//
// The original event is restored in the "after" phase so earlier interceptors
// receive the original, unstripped event.
//
// registerEventDB('add', (db, [id, arg]) => db + arg)
//
// Becomes:
//
// registerEventDB('add', [payload], (db, [arg]) => db + arg)
//                            |
//                            └────── interceptor
export var payload = {
  id: "payload",
  before: function(context) {
    var event = context.coeffects.event
    context.coeffects.event = event.slice(1)
    context.coeffects._originalEvent = event
    return context
  },
  after: function(context) {
    context.coeffects.event = context.coeffects._originalEvent
    return context
  },
}

export function path(path) {
  return {
    id: "path",
    before: function(context) {
      // Preserve the original db so it can be restored after diving into "path".
      var target = context.coeffects.db
      context.coeffects._originalDB = target

      // Lookup the value at "path" in "db" and make that the new "db" for
      // subsequent interceptors.
      for (var i = 0; i < path.length - 1; i++) {
        target = target[path[i]]
        if (!target) {
          break
        }
      }
      context.coeffects.db = target ? target[path[i]] : undefined
      return context
    },
    after: function(context) {
      if ("db" in context.effects) {
        var origDB = context.coeffects._originalDB
        var nextDB = assoc(origDB, path, context.effects.db)
        context.effects.db = nextDB
      }
      return context
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
          context.effects = {}
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
      if ("db" in context.effects) {
        context.effects.db = fn(context.effects.db, context.coeffects.event)
      }
      return context
    },
  }
}

export function after(fn) {
  return {
    id: "after",
    after: function(context) {
      if ("db" in context.effects) {
        fn(context.effects.db, context.coeffects.event)
      }
      return context
    },
  }
}

export var debug = {
  id: "debug",
  before: function(context) {
    console.log("@re-frame: handling event: ", context.coeffects.event)
    return context
  },
  after: function(context) {
    var event = context.coeffects.event
    var origDB = context.coeffects.db
    var nextDB = context.effects.db

    if (!("db" in context.effects) || nextDB === origDB) {
      console.log("@re-frame: no db change caused by event: ", event)
      return context
    }
    console.group("@re-frame: db change caused by event: ", event)
    console.log("@re-frame: before: ", origDB)
    console.log("@re-frame: after: ", nextDB)
    console.groupEnd()
    return context
  },
}

export var immer = {
  id: "immer",
  before: function(context) {
    context.coeffects.db = createDraft(context.coeffects.db)
    return context
  },
  after: function(context) {
    context.effects.db = finishDraft(context.effects.db || context.coeffects.db)
    return context
  },
}

var _hasOwnProperty = Object.prototype.hasOwnProperty
function shallowClone(target) {
  var clone = {}
  for (var key in target) {
    if (_hasOwnProperty.call(target, key)) {
      clone[key] = target[key]
    }
  }
  return clone
}

/**
 * Immutably writes a value to a path inside an object.
 */
export function assoc(target, path, value) {
  var res = shallowClone(target)
  var curr = res
  for (var i = 0; i < path.length - 1; i++) {
    var key = path[i]
    curr = curr[key] = shallowClone(curr[key])
  }
  curr[path[i]] = value
  return res
}

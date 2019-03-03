import {assoc} from "@re-frame/utils"
import {createDraft, finishDraft} from "immer"

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
    return assoc(
      context,
      ["coeffects", "event"],
      context.coeffects.event.slice(1)
    )
  },
}

export function path(path) {
  path = [].concat(path)
  return {
    id: "path",
    before: function(context) {
      // Preserve the original db so we can restore it after diving into `path`.
      var db = context.coeffects.db
      context = assoc(context, ["coeffects", "_originalDB"], db)

      // `db` for all future interceptors is the value at `path`.
      let valueAtPath = db
      for (var i = 0; i < path.length; i++) {
        if (!valueAtPath) {
          valueAtPath = undefined
          break
        }
        valueAtPath = valueAtPath[path[i]]
      }
      context = assoc(context, ["coeffects", "db"], valueAtPath)
      return context
    },
    after: function(context) {
      // Restore the original db and update its value at `path`.
      var db = assoc(context.coeffects._originalDB, path, context.effects.db)
      return assoc(context, ["effects", "db"], db)
    },
  }
}

export var immer = {
  id: "immer",
  before: function(context) {
    var draft = createDraft(context.coeffects.db)
    return assoc(context, ["coeffects", "db"], draft)
  },
  after: function(context) {
    var db = finishDraft(context.effects.db || context.coeffects.db)
    return assoc(context, ["effects", "db"], db)
  },
}

import {assoc} from "@re-frame/utils"

export function enableEventLogs(store) {
  function logEvent(event) {
    if (event[0].indexOf("@re-frame") !== -1) return
    console.log("Event:", event)
  }

  store.addPostEventCallback(logEvent)
}

export function enableTimeTravel(store, opts) {
  var MAX_HISTORY_SIZE = (opts && opts.maxHistorySize) || 100

  function init(db) {
    var history = new Array(MAX_HISTORY_SIZE)
    history[0] = {db: db}
    db = assoc(db, ["@re-frame/time-travel"], {history: history})
    return db
  }

  function recordEvent(db, event) {
    var history = db["@re-frame/time-travel"].history
    history = history.concat({db: db, event: event[1]})
    if (history.length > MAX_HISTORY_SIZE) {
      history = history.slice(1) // TODO: bad, should pop()
    }
    db = assoc(db, ["@re-frame/time-travel"], {history: history})
    return db
  }
  function travel(db, event) {
    var distance = event[1]
    var tt = db["@re-frame/time-travel"]
    var cursor = tt.cursor || tt.history.length - 1
    cursor += distance
    if (cursor > tt.history.length - 1) {
      cursor = tt.history.length - 1
    } else if (cursor < 0) {
      cursor = 0
    }
    db = tt.history[cursor].db
    tt = assoc(tt, ["cursor"], cursor)
    db = assoc(db, ["@re-frame/time-travel"], tt)
    return db
  }

  store.registerEventDB("@re-frame/time-travel/init", init)
  store.registerEventDB("@re-frame/time-travel/record-event", recordEvent)
  store.registerEventDB("@re-frame/time-travel/travel", travel)
  store.addPostEventCallback(function(event) {
    if (event[0].indexOf("@re-frame/time-travel") !== -1) return
    store.dispatchSync(["@re-frame/time-travel/record-event", event])
  })
  store.next = function() {
    store.dispatchSync(["@re-frame/time-travel/travel", 1])
  }
  store.previous = function() {
    store.dispatchSync(["@re-frame/time-travel/travel", -1])
  }
  store.dispatchSync(["@re-frame/time-travel/init"])
}

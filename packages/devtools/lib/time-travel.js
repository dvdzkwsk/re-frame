/**
 * @param {object} store - the re-frame store to enable time travel for
 * @param {object} [opts] - optional configuration
 */
export function enableTimeTravel(store, opts) {
  var MAX_HISTORY_SIZE = (opts && opts.maxHistorySize) || 100
  var DO_TIME_TRAVEL = "@re-frame/time-travel"

  var id = 0 // auto-incrementing id for each history entry
  var cursor = 0 // where are we in history?
  var history = new Array(MAX_HISTORY_SIZE)
  history[0] = {db: store.deref(), id: id++}

  function recordEvent(event) {
    if (event[0] === DO_TIME_TRAVEL) return

    cursor++
    if (cursor >= MAX_HISTORY_SIZE) {
      cursor = 0
    }
    history[cursor] = {db: store.deref(), event: event, id: id++}
  }

  function travel(distance) {
    var nextCursor = cursor + distance

    // If moving beyond the bounds of the array, circle back to the other side.
    if (nextCursor >= MAX_HISTORY_SIZE) {
      nextCursor = 0
    } else if (nextCursor < 0) {
      nextCursor = MAX_HISTORY_SIZE - 1
    }

    // Prevent traveling beyond recorded history
    if (!history[nextCursor]) {
      return
    }

    // When MAX_HISTORY_SIZE is reached we begin overwriting old entries. Thus,
    // we need to check that the entry we're about to move to respects the
    // travel direction.
    //
    // [9, 10, 11, 12, 8, 7, 6, 5]
    //              ^            | ----------- maxHistoryLength
    //              |
    //              ------------- cursor
    //
    // Here, the entry ahead of "cursor" is actually the oldest retained entry.
    // We want to move forward in *time*, and this is different than moving
    // forward in the history *array*.
    if (distance > 0 && history[nextCursor].id < history[cursor].id) {
      return
    } else if (distance < 0 && history[nextCursor].id > history[cursor].id) {
      return
    }

    cursor = nextCursor
    store.dispatchSync([DO_TIME_TRAVEL, history[cursor].db])
  }

  store.next = function() {
    travel(1)
  }
  store.previous = function() {
    travel(-1)
  }
  store.addPostEventCallback(recordEvent)
  store.registerEventDB(DO_TIME_TRAVEL, function(db, event) {
    return event[1]
  })
}

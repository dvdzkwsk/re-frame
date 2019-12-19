/**
 * @param {object} store - the re-frame store to enable time travel for
 * @param {Function} sendMessage
 */
export function enableTimeTravel(store, sendMessage) {
  let cursor = 0 // where are we in history?
  let history = [] // all recorded history
  let IS_STORE_FROZEN = false // is the store ignoring events?

  const unfrozenDispatch = store.dispatch
  const unfrozenDispatchSync = store.dispatchSync

  store.dispatch = event => {
    if (IS_STORE_FROZEN) return
    return unfrozenDispatch(event)
  }
  store.dispatchSync = event => {
    if (IS_STORE_FROZEN) return
    return unfrozenDispatchSync(event)
  }

  function init() {
    store.registerSubscription("@re-frame/db", db => db)
    store.registerEventDB("@re-frame/time-travel", (db, event) => event[1])
    store.registerPostEventCallback(recordEvent)

    const db = store.query(["@re-frame/db"])
    if (db) {
      history.push({id: generateEventId(), db})
    }
  }

  /**
   * Records the event object and resulting db into history for each event that
   * is processed by the store.
   *
   * @param {object} event
   */
  function recordEvent(event) {
    // Time travel is implemented within the instrumented store. Don't record
    // its events — we don't want the user to know about them.
    if (isTimeTravelEvent(event)) return

    const entry = {
      id: generateEventId(),
      db: store.query(["@re-frame/db"]),
      event: event,
    }
    sendMessage("recorded-event", entry)
    history.push(entry)
    cursor++
  }

  /**
   * @param {number} index — the index in history to travel to.
   */
  function travelToIndex(index) {
    const entry = history[index]
    if (!entry) return

    freeze()
    if (entry.event) {
      console.info("@re-frame: travel to event %s", entry.event[0], {
        event: entry.event,
      })
    }
    cursor = index
    unfrozenDispatchSync(["@re-frame/time-travel", entry.db])
  }

  function clearHistory() {
    history = []
  }

  /**
   * @param {number} id - the id of a history entry to travel to.
   */
  function travelToId(id) {
    const idx = history.findIndex(entry => entry.id === id)
    travelToIndex(idx)
  }

  function forward(count = 1) {
    travelToIndex(Math.min(cursor + count, history.length - 1))
  }

  function back(count = 1) {
    travelToIndex(Math.max(cursor - count, 0))
  }

  function first() {
    travelToIndex(0)
  }

  function last() {
    travelToIndex(history.length - 1)
  }

  /**
   * Stops the store from processing any new events. This way, the user can
   * jump around history without causing further state changes.
   */
  function freeze() {
    IS_STORE_FROZEN = true
  }

  /**
   * Allows the store to start processing new events again. Useful when the
   * user wants to leave time travel mode.
   */
  function unfreeze() {
    IS_STORE_FROZEN = false
  }

  async function play(ms) {
    const wait = () => new Promise(res => setTimeout(res, ms))
    while (cursor < history.length - 1) {
      await wait()
      travelToIndex(cursor + 1)
    }
  }

  init()
  return {travelToId, forward, back, first, last, play, unfreeze, clearHistory}
}

let id = 0
function generateEventId() {
  return id++
}

function isTimeTravelEvent(event) {
  return event[0] === "@re-frame/time-travel"
}

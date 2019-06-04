import {createStore} from "@re-frame/standalone"

export const store = createStore()

const port = chrome.runtime.connect({name: "@re-frame/devtools"})
const sendEventToPage = {
  id: "send-event-to-page",
  after(ctx) {
    port.postMessage({
      event: ctx.coeffects.event[0],
      payload: ctx.coeffects.event[1],
      reframeDevtoolsToPage: true,
    })
    return ctx
  },
}

store.computed("db", db => db.db)
store.computed("connected?", db => db && db.connected)
store.computed("history", db => db.history)
store.computed("time-traveling?", db => db.isTimeTraveling)

store.event("init", () => ({connected: false}))
store.event("connected", () => ({
  connected: true,
  db: null,
  history: [],
  isTimeTraveling: false,
}))
store.event("sync-db", (db, [_, dbValue]) => ({...db, db: dbValue}))
store.event("recorded-event", (db, [_, entry]) => ({
  ...db,
  history: db.history.concat([entry]),
}))

store.event("request-db", [sendEventToPage], db => db)
store.event("time-travel", [sendEventToPage], db => ({
  ...db,
  isTimeTraveling: true,
}))
store.event("time-travel:stop", [sendEventToPage], db => ({
  ...db,
  isTimeTraveling: false,
}))
store.event("time-travel:forward", [sendEventToPage], db => db)
store.event("time-travel:back", [sendEventToPage], db => db)
store.event("time-travel:clear-history", [sendEventToPage], db => ({
  ...db,
  history: [],
}))

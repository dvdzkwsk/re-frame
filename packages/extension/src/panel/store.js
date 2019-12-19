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

store.registerSubscription("db", db => db.db)
store.registerSubscription("connected?", db => db && db.connected)
store.registerSubscription("history", db => db.history)
store.registerSubscription("time-traveling?", db => db.isTimeTraveling)

store.registerEventDB("init", () => ({connected: false}))
store.registerEventDB("connected", () => ({
  connected: true,
  db: null,
  history: [],
  isTimeTraveling: false,
}))
store.registerEventDB("sync-db", (db, [_, dbValue]) => ({...db, db: dbValue}))
store.registerEventDB("recorded-event", (db, [_, entry]) => ({
  ...db,
  history: db.history.concat([entry]),
}))

store.registerEventDB("request-db", [sendEventToPage], db => db)
store.registerEventDB("time-travel", [sendEventToPage], db => ({
  ...db,
  isTimeTraveling: true,
}))
store.registerEventDB("time-travel:stop", [sendEventToPage], db => ({
  ...db,
  isTimeTraveling: false,
}))
store.registerEventDB("time-travel:forward", [sendEventToPage], db => db)
store.registerEventDB("time-travel:back", [sendEventToPage], db => db)
store.registerEventDB("time-travel:clear-history", [sendEventToPage], db => ({
  ...db,
  history: [],
}))

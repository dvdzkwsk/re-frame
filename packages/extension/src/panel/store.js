import {createStore} from "@re-frame/standalone"

export const store = createStore()

store.computed("connected?", db => db && db.connected)
store.computed("history", db => db.history)
store.computed("db", db => db.db)

store.event("init", () => ({connected: false}))
store.event("connected", () => ({
  connected: true,
  db: null,
  history: [],
}))
store.event("sync-db", (db, [_, dbValue]) => ({...db, db: dbValue}))
store.event("clear-history", db => ({...db, history: []}))
store.event("recorded-event", (db, [_, entry]) => ({
  ...db,
  history: db.history.concat([entry]),
}))

store.event.fx("request-db", (ctx, event) => ({
  sendMessage: ["sync-db"],
}))
store.event.fx("time-travel", (ctx, event) => ({
  sendMessage: ["time-travel", event[1]],
}))

const port = chrome.runtime.connect({name: "@re-frame/devtools"})
store.effect("sendMessage", store => ([event, payload]) => {
  port.postMessage({event, payload})
})

chrome.runtime.onConnect.addListener(port => {
  if (port.name === "@re-frame/page->devtools") {
    port.onMessage.addListener(msg => {
      store.dispatch([msg.event, msg.payload && JSON.parse(msg.payload)])
    })
  }
})

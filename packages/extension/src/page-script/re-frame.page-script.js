import {enableTimeTravel} from "./lib/time-travel.js"

/**
 * This script is injected into the main window via re-frame.content-script.js
 * and has access to the primary window context. Its purpose is to pass
 * information between the user's store and the re-frame devtools.
 */
window.__RE_FRAME_ENABLE_STORE_DEVTOOLS__ = store => {
  sendMessageToDevtools("connected")
  const TimeTravel = enableTimeTravel(store, sendMessageToDevtools)

  function handleMessage(msg) {
    if (!isMessageFromDevtools(msg)) return

    const {event, payload} = msg.data
    switch (event) {
      case "time-travel":
        TimeTravel.travelToId(payload)
        break
      case "time-travel:forward":
        TimeTravel.forward()
        break
      case "time-travel:back":
        TimeTravel.back()
        break
      case "time-travel:stop":
        TimeTravel.unfreeze()
        break
      case "time-travel:clear-history":
        TimeTravel.clearHistory()
        break
      case "sync-db":
        sendMessageToDevtools("sync-db", store.query(["@re-frame/db"]))
        break
    }
  }
  window.addEventListener("message", handleMessage)
}

function sendMessageToDevtools(event, payload) {
  window.postMessage({
    type: "@re-frame/page->devtools",
    event,
    payload: payload && JSON.stringify(payload),
  })
}

function isMessageFromDevtools(event) {
  return (
    event.source === window &&
    event.data.type &&
    event.data.type === "@re-frame/devtools->page"
  )
}

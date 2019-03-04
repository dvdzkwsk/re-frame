export function enableEventLogs(store) {
  function logEvent(event) {
    if (event[0].indexOf("@re-frame") !== -1) return
    console.log("Event:", event)
  }

  store.addPostEventCallback(logEvent)
}

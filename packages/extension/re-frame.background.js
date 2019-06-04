function main() {
  forwardDevtoolsMessagesToPage()
}

function forwardDevtoolsMessagesToPage() {
  chrome.runtime.onConnect.addListener(port => {
    if (port.name === "@re-frame/devtools") {
      console.log("background: connected to @re-frame/devtools")
      port.onMessage.addListener(msg => {
        chrome.tabs.query({currentWindow: true, active: true}, tabs => {
          const tab = tabs[0]
          if (!tab) return
          // console.log(
          // "background: forward message to @re-frame/devtools content script",
          // msg
          // )

          chrome.tabs.sendMessage(tab.id, msg)
          // TODO: why does this not work?
          // const p = chrome.tabs.connect(tab.id, {name: "@re-frame/devtools"})
          // p.postMessage(msg)
        })
      })
    }
  })
}

main()

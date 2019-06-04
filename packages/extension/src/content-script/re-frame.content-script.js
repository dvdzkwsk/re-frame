function main() {
  establishCommunicationBus()
  injectPageScript()
}

function establishCommunicationBus() {
  forwardPageMessagesToDevtools()
  forwardDevtoolsMessagesToPage()
}

function forwardPageMessagesToDevtools() {
  function isMessageFromPage(event) {
    return (
      event.source === window &&
      event.data.type &&
      event.data.type === "@re-frame/page->devtools"
    )
  }

  const port = chrome.runtime.connect({name: "@re-frame/page->devtools"})
  window.addEventListener("message", event => {
    if (isMessageFromPage(event)) {
      port.postMessage(event.data)
    }
  })
}

function forwardDevtoolsMessagesToPage() {
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.reframeDevtoolsToPage) {
      const {event, payload} = msg
      window.postMessage({type: "@re-frame/devtools->page", event, payload})
    }
  })
}

function injectPageScript() {
  const script = document.createElement("script")
  const src = chrome.extension.getURL("/dist/re-frame.page-script.js")
  script.setAttribute("src", src)
  ;(document.head || document.documentElement).appendChild(script)
}

main()

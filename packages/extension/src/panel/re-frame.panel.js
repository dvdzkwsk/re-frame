import {html, render} from "./lib/rendering.js"
import {App} from "./components/app.js"
import {StoreProvider} from "@re-frame/react"
import {store} from "./store.js"

function main() {
  store.dispatchSync(["init"])
  mount()
}

function mount() {
  render(
    html`
      <${StoreProvider} value=${store}>
        <${App} />
      </${StoreProvider}>
    `,
    document.getElementById("app")
  )
}

main()

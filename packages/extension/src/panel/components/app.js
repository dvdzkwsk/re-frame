import {html, useState, useSubscription} from "../lib/rendering.js"
import {EventsScreen} from "./events-screen.js"
import {DBScreen} from "./db-screen.js"

const SCREENS = [EventsScreen, DBScreen]

export const App = () => {
  const [currentScreen, setCurrentScreen] = useState("Events")
  const connected = useSubscription(["connected?"])

  const CurrentScreen = SCREENS.find(s => s.id === currentScreen)

  return html`
    <div>
      <header className="header">
        <nav>
          <ul className="screen-list list-unstyled">
            ${SCREENS.map(screen => {
              return html`
                <li key=${screen.id}>
                  <a
                    href="#"
                    className="screen-link"
                    data-is-active=${screen.id === CurrentScreen.id}
                    onClick=${e => {
                      e.preventDefault()
                      setCurrentScreen(screen.id)
                    }}
                  >
                    ${screen.id}
                  </a>
                </li>
              `
            })}
          </ul>
        </nav>
      </header>
      <main className="active-screen">
        ${connected
          ? html`
              <${CurrentScreen} />
            `
          : html`
              <p>Not connected.</p>
            `}
      </main>
    </div>
  `
}

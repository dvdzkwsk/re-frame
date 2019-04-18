import {html, useDispatch, useSubscription} from "../lib/rendering.js"

export const EventsScreen = () => {
  const dispatch = useDispatch()
  const history = useSubscription(["history"]) || []

  function clearEvents() {
    dispatch(["clear-history"])
  }

  return html`
    <div className="events-screen">
      <button onClick=${clearEvents}>Clear</button>
      <hr />
      <ol className="events-list">
        ${history.map(({id, event}) => {
          return html`
            <li
              key=${id}
              className="event"
              onClick=${() => {
                dispatch(["time-travel", id])
              }}
            >
              ${event[0]}
            </li>
          `
        })}
      </ol>
    </div>
  `
}
EventsScreen.id = "Events"

import {
  html,
  useDispatch,
  useEffect,
  useSubscription,
} from "../lib/rendering.js"

export const EventsScreen = () => {
  const dispatch = useDispatch()
  const history = useSubscription(["history"]) || []
  const isTimeTraveling = useSubscription(["time-traveling?"])

  function clearEvents() {
    dispatch(["time-travel:clear-history"])
  }

  useEffect(() => {
    function handleKeydown(e) {
      switch (e.key) {
        case "ArrowRight":
          dispatch(["time-travel:forward"])
          break
        case "ArrowLeft":
          dispatch(["time-travel:back"])
          break
      }
    }
    document.addEventListener("keydown", handleKeydown)
    return () => {
      document.removeEventListener("keydown", handleKeydown)
    }
  }, [])

  return html`
    <div className="events-screen">
      <button onClick=${clearEvents}>Clear</button>
      ${isTimeTraveling &&
        html`
          <button
            onClick=${() => {
              dispatch(["time-travel:stop"])
            }}
          >
            Stop Time Traveling
          </button>
        `}
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

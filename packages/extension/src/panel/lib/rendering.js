import htm from "htm"
import React from "react"
import ReactDOM from "react-dom"
export {useDispatch, useSubscription} from "@re-frame/react"

export const Component = React.Component
export const html = htm.bind(React.createElement)
export const render = ReactDOM.render
export const useState = React.useState
export const useEffect = React.useEffect

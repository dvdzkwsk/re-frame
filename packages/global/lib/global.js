import {createStore} from "@re-frame/store"
export * from "@re-frame/interceptors"
export * from "@re-frame/effects"

var store = createStore()

export var dispatch = store.dispatch
export var dispatchSync = store.dispatchSync
export var registerEventDB = store.registerEventDB
export var registerEventFX = store.registerEventFX
export var registerEffect = store.registerEffect
export var registerPostEventCallback = store.registerPostEventCallback
export var removePostEventCallback = store.removePostEventCallback
export var query = store.query
export var subscribe = store.subscribe
export var inject = store.inject
export var context = store.context
export var computed = store.computed

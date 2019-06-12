import {createStore} from "@re-frame/store"
export * from "@re-frame/interceptors"
export * from "@re-frame/effects"

var store = createStore()

export var dispatch = store.dispatch
export var dispatchSync = store.dispatchSync
export var query = store.query
export var subscribe = store.subscribe
export var inject = store.inject
export var context = store.context
export var event = store.event
export var effect = store.effect
export var computed = store.computed
export var addPostEventCallback = store.addPostEventCallback
export var removePostEventCallback = store.removePostEventCallback

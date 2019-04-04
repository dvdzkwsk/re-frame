import {createStore} from "@re-frame/store"
export * from "@re-frame/interceptors"
export * from "@re-frame/effects"

var store = createStore()

export var getState = store.getState
export var dispatch = store.dispatch
export var dispatchSync = store.dispatchSync
export var query = store.query
export var subscribe = store.subscribe
export var injectCoeffect = store.injectCoeffect
export var registerCoeffect = store.registerCoeffect
export var registerEventDB = store.registerEventDB
export var registerEventFX = store.registerEventFX
export var registerEffect = store.registerEffect
export var registerSubscription = store.registerSubscription
export var addPostEventCallback = store.addPostEventCallback
export var removePostEventCallback = store.removePostEventCallback

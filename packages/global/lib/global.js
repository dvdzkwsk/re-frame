import {createStore} from "@re-frame/store"
export * from "@re-frame/interceptors"
export * from "@re-frame/effects"

const store = createStore()

export const getState = store.getState
export const dispatch = store.dispatch
export const dispatchSync = store.dispatchSync
export const query = store.query
export const subscribe = store.subscribe
export const injectCoeffect = store.injectCoeffect
export const registerCoeffect = store.registerCoeffect
export const registerEventDB = store.registerEventDB
export const registerEventFX = store.registerEventFX
export const registerEffect = store.registerEffect
export const registerSubscription = store.registerSubscription
export const addPostEventCallback = store.addPostEventCallback
export const removePostEventCallback = store.removePostEventCallback

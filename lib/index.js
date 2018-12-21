/**
 * This package can be used in two "modes":
 *
 * 1. Singleton
 *
 * This should be familiar to re-frame users coming from Clojure, where
 * re-frame is packaged as a singleton. In this mode, the store state and
 * registry are global. This affords certain conveniences, namely that the
 * store can be imported directly from the re-frame package.
 *
 * This convenience cannot be understated. In practice, it means the store
 * instance does not have to be threaded throughout the application. React
 * developers should be familiar with the @connect decorator, but this only
 * applies to the React tree. If you wish to deal with a store outside of
 * React, you often end up threading the instance through layers of
 * application code.
 *
 * There are drawbacks to using a singleton, especially when it comes to
 * server-side rendering. In cases like this, it's necessary to pass around a
 * dynamic store reference because multiple stores need to exist in parallel
 * (since multiple requests can be handled concurrently). If all modules
 * directly reference a singleton, it becomes impossible to keep their states
 * isolated.
 *
 * However, for many applications, especially those that are client-side only,
 * it can be premature (and headache-inducing) to properly thread context.
 * Pragmatism and convenience wins out for many use cases, and thus we provide
 * a singleton. However, you should be aware of the tradeoffs.
 *
 * 2. Factory
 *
 * This should be familiar to redux users coming from React. This factory
 * allows users to create stores that are isolated from each other, both in
 * state and in {EventDB,EventFX,Coeffect} handler registrations. Use this API
 * when you need to support multiple (or dynamic) stores.
 *
 * A store instance provides the following methods:
 * const store = createStore()
 * store.dispatch(event)
 * store.registerEventDB(id, interceptors?, handler)
 * store.registerEventFX(id, interceptors?, handler)
 * store.registerCoeffect(id, handler)
 * store.snapshot()
 */
import createStore from './create-store.js'

// ---- Singleton -----------------------------------------
const SINGLETON = createStore()
export var dispatch = SINGLETON.dispatch
export var registerEventDB = SINGLETON.registerEventDB
export var registerEventFX = SINGLETON.registerEventFX
export var registerCoeffect = SINGLETON.registerCoeffect
export var snapshot = SINGLETON.snapshot

// ---- Factory -------------------------------------------
export {createStore}

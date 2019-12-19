import test from "ava"
import * as reframe from "../lib/global.js"

test('exports "dispatch"', t => {
  t.is(typeof reframe.dispatch, "function")
})

test('exports "dispatchSync"', t => {
  t.is(typeof reframe.dispatchSync, "function")
})

test('exports "query"', t => {
  t.is(typeof reframe.query, "function")
})

test('exports "subscribe"', t => {
  t.is(typeof reframe.subscribe, "function")
})

test('exports "registerSubscription"', t => {
  t.is(typeof reframe.registerSubscription, "function")
})

test('exports "registerEventDB"', t => {
  t.is(typeof reframe.registerEventDB, "function")
})

test('exports "registerEventFX"', t => {
  t.is(typeof reframe.registerEventFX, "function")
})

test('exports "registerEffect"', t => {
  t.is(typeof reframe.registerEffect, "function")
})

test('exports "registerCoeffect"', t => {
  t.is(typeof reframe.registerCoeffect, "function")
})

test('exports "injectCoeffect"', t => {
  t.is(typeof reframe.injectCoeffect, "function")
})

test('exports "registerPostEventCallback"', t => {
  t.is(typeof reframe.registerPostEventCallback, "function")
})

test('exports "removePostEventCallback"', t => {
  t.is(typeof reframe.removePostEventCallback, "function")
})

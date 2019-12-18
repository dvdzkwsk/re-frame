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

test('exports "computed"', t => {
  t.is(typeof reframe.computed, "function")
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

test('exports "context"', t => {
  t.is(typeof reframe.context, "function")
})

test('exports "inject"', t => {
  t.is(typeof reframe.inject, "function")
})

test('exports "registerPostEventCallback"', t => {
  t.is(typeof reframe.registerPostEventCallback, "function")
})

test('exports "removePostEventCallback"', t => {
  t.is(typeof reframe.removePostEventCallback, "function")
})

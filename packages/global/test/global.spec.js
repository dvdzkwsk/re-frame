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

test('exports "event"', t => {
  t.is(typeof reframe.event, "function")
})

test('exports "event.fx"', t => {
  t.is(typeof reframe.event.fx, "function")
})

test('exports "context"', t => {
  t.is(typeof reframe.context, "function")
})

test('exports "inject"', t => {
  t.is(typeof reframe.inject, "function")
})

test('exports "addPostEventCallback"', t => {
  t.is(typeof reframe.addPostEventCallback, "function")
})

test('exports "removePostEventCallback"', t => {
  t.is(typeof reframe.removePostEventCallback, "function")
})

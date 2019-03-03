import test from "ava"
import * as fx from "../lib/effects.js"

test('exports "http"', t => {
  t.is(typeof fx.http, "function")
})

test('exports "orchestrate"', t => {
  t.is(typeof fx.orchestrate, "function")
})

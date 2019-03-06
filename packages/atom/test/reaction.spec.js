import test from "ava"
import {atom, reaction} from "../lib/atom.js"

test("synchronously runs the computation and returns an atom containing the result", t => {
  const a = atom("hello")
  const r = reaction(() => a.deref())
  t.is(r.deref(), "hello")
})

test("re-runs the computation when a tracked atom is changed", t => {
  const a = atom(1)
  const r = reaction(() => a.deref())
  t.is(r.deref(), 1)
  a.reset(2)
  t.is(r.deref(), 2)
})

test("stops watching atoms that were, but are no longer, used in the computation", t => {
  let reactions = 0
  const a = atom()
  const b = atom()

  let atomToDeref = a
  const r = reaction(() => {
    reactions++
    return atomToDeref.deref()
  })
  reactions = 0 // exclude the initial reaction that primes the atom

  // should be tracking "a"
  a.reset("a")
  t.is(reactions, 1)
  a.reset("a!")
  t.is(reactions, 2)

  // should not be tracking "b"
  b.reset("b")
  t.is(reactions, 2)

  // reaction is still tracking "a", so need to cause that reaction to re-run
  // so that it switches over to "b".
  atomToDeref = b
  a.reset("a")
  t.is(reactions, 3)
  t.is(r.deref(), "b")

  // should not be tracking "a" any longer
  a.reset("a!")
  t.is(reactions, 3)

  // should now be tracking "b"
  b.reset("b!")
  t.is(reactions, 4)
  t.is(r.deref(), "b!")
})

// TODO: do we even support this? What's the use case?
test("nested reactions track atom derefs independently", t => {
  let r1Reactions = 0
  let r2Reactions = 0

  const a = atom()
  const b = atom()

  let r1 // should only care about "a"
  let r2 // should only care about "b"

  r1 = reaction(() => {
    if (!r2) {
      r2 = reaction(() => {
        r2Reactions++
        return b.deref()
      })
    }
    r1Reactions++
    return a.deref()
  })
  r1Reactions = 0 // exclude the initial reaction that primes the atom
  r2Reactions = 0 // exclude the initial reaction that primes the atom

  a.reset("a")
  t.is(r1Reactions, 1)
  t.is(r2Reactions, 0)

  b.reset("b")
  t.is(r1Reactions, 1)
  t.is(r2Reactions, 1)
})

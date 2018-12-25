import test from 'ava'
import EventQueue from '../lib/event-queue.js'

test('initializes with an empty queue', t => {
  const queue = new EventQueue()
  t.is(queue.count(), 0)
})

test('push() adds an event to the queue', t => {
  const queue = new EventQueue()
  queue.pause()
  queue.push(['foo'])
  t.is(queue.count(), 1)
  queue.push(['bar'])
  t.is(queue.count(), 2)
  queue.push(['baz'])
  queue.push(['qux'])
  queue.push(['moo'])
  t.is(queue.count(), 5)
})

test('purge() removes all queued events', t => {
  const queue = new EventQueue()
  queue.pause()
  queue.push(['foo'])
  queue.push(['bar'])
  queue.push(['baz'])
  t.is(queue.count(), 3)
  queue.purge()
  t.is(queue.count(), 0)
})

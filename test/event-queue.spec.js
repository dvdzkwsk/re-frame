import test from 'ava'
import EventQueue from '../lib/event-queue.js'

function makePausedQueue() {
  const queue = new EventQueue()
  queue.pause()
  return queue
}

test('initializes with an empty queue', t => {
  const queue = makePausedQueue()
  t.is(queue.size(), 0)
})

test('push() adds an event to the queue', t => {
  const queue = makePausedQueue()

  queue.push(['foo'])
  t.is(queue.size(), 1)

  queue.push(['bar'])
  t.is(queue.size(), 2)

  queue.push(['baz'])
  queue.push(['qux'])
  queue.push(['moo'])
  t.is(queue.size(), 5)
})

test('purge() removes all queued events', t => {
  const queue = makePausedQueue()

  queue.push(['foo'])
  queue.push(['bar'])
  queue.push(['baz'])
  t.is(queue.size(), 3)

  queue.purge()
  t.is(queue.size(), 0)
})

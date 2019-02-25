import test from 'ava'
import {createEventQueue} from '../lib/event-queue.js'

function size(queue) {
  return queue.size()
}

function makePausedQueue() {
  const queue = createEventQueue()
  queue.pause()
  return queue
}

test('initializes with an empty queue', t => {
  const queue = makePausedQueue()
  t.is(size(queue), 0)
})

test('push() adds an event to the queue', t => {
  const queue = makePausedQueue()

  queue.push(['foo'])
  t.is(size(queue), 1)

  queue.push(['bar'])
  t.is(size(queue), 2)

  queue.push(['baz'])
  queue.push(['qux'])
  queue.push(['moo'])
  t.is(size(queue), 5)
})

test('purge() removes all queued events', t => {
  const queue = makePausedQueue()

  queue.push(['foo'])
  queue.push(['bar'])
  queue.push(['baz'])
  t.is(size(queue), 3)

  queue.purge()
  t.is(size(queue), 0)
})

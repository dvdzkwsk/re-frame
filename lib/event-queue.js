function EventQueue() {
  this._queue = []
  this._state = 'idle'
}

EventQueue.prototype.push = function push(event) {
  this._trigger('add-event', event)
}

EventQueue.prototype.purge = function purge() {
  this._queue = []
}

EventQueue.prototype._trigger = function trigger(event, arg) {
  switch (this._state) {
    case 'idle':
      switch (event) {
        case 'add-event':
          this._state = 'scheduled'
          this._addEvent(arg)
          this._runNextTick()
          return
      }
      break
    case 'scheduled':
      switch (event) {
        case 'add-event':
          // state remains "scheduled"
          this._addEvent(arg)
          return
        case 'run-queue':
          this._state = 'running'
          this._runQueue()
          return
      }
      break
    case 'running':
      switch (event) {
        case 'add-event':
          // state remains "running"
          this._addEvent(arg)
          return
        case 'pause':
          this._state = 'paused'
          this._pause()
          return
        case 'exception':
          this._state = 'idle'
          this._handleException(arg)
          return
        case 'finish-run':
          if (this._queue.length === 0) {
            this._state = 'idle'
            return
          }
          this._state = 'scheduled'
          this._runNextTick()
          return
      }
      break
    case 'paused':
      switch (event) {
        case 'add-event':
          // state remains "paused"
          this._addEvent(arg)
          return
        case 'resume':
          this._state = 'running'
          this._resume()
          return
      }
      break
  }
}

EventQueue.prototype._addEvent = function _addEvent(event) {
  this._queue.push(event)
}

EventQueue.prototype._pause = function _pause() {}

EventQueue.prototype._resume = function _resume() {}

EventQueue.prototype._runNextTick = function _runNextTick() {}

EventQueue.prototype._handleEvent = function _handleEvent(event) {}

EventQueue.prototype._handleException = function _handleException(err) {}

export default EventQueue

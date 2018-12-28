function EventQueue() {
  this._queue = []
  this._state = 'idle'
}

// ---- Public API ----------------------------------------
EventQueue.prototype.push = function push(event) {
  this._trigger('add-event', event)
}

EventQueue.prototype.purge = function purge() {
  this._queue = []
}

EventQueue.prototype.pause = function pause() {
  this._trigger('pause')
}

EventQueue.prototype.resume = function resume() {
  this._trigger('resume')
}

EventQueue.prototype.count = function count() {
  return this._queue.length
}

// ---- Private API ---------------------------------------
var nextTick = setTimeout

EventQueue.prototype._trigger = function trigger(event, arg) {
  switch (this._state) {
    case 'idle':
      switch (event) {
        case 'pause':
          this._state = 'paused'
          return
        case 'add-event':
          this._state = 'scheduled'
          this._addEvent(arg)
          this._runNextTick()
          return
      }
      break
    case 'scheduled':
      switch (event) {
        case 'pause':
          this._state = 'paused'
          return
        case 'add-event':
          this._state = 'scheduled'
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
        case 'pause':
          this._state = 'paused'
          return
        case 'add-event':
          this._state = 'running'
          this._addEvent(arg)
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
          this._state = 'paused'
          this._addEvent(arg)
          return
        case 'resume':
          this._state = 'running'
          return
      }
      break
  }
}

EventQueue.prototype._addEvent = function _addEvent(event) {
  this._queue.push(event)
}

EventQueue.prototype._runNextTick = function _runNextTick() {
  var _this = this
  nextTick(function() {
    _this._trigger('run-queue')
  })
}

EventQueue.prototype._runQueue = function _runQueue() {
  var events = this._queue.slice()
  for (var i = 0; i < events.length; i++) {
    this._processEvent(events[i])
  }
  this.purge() // HACK, remove
  this._trigger('finish-run')
}

EventQueue.prototype._handleException = function _handleException(err) {
  this.purge()
  throw err
}

export default EventQueue

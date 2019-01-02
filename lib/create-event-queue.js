var nextTick = setTimeout

function createEventQueue(processEvent) {
  var _queue = []
  var _state = 'idle'

  function _trigger(event, arg) {
    switch (_state) {
      case 'idle':
        switch (event) {
          case 'pause':
            _state = 'paused'
            return
          case 'add-event':
            _state = 'scheduled'
            _addEvent(arg)
            _runNextTick()
            return
        }
        break
      case 'scheduled':
        switch (event) {
          case 'pause':
            _state = 'paused'
            return
          case 'add-event':
            // state remains "scheduled"
            _addEvent(arg)
            return
          case 'run-queue':
            _state = 'running'
            _runQueue()
            return
        }
        break
      case 'running':
        switch (event) {
          case 'pause':
            _state = 'paused'
            return
          case 'add-event':
            // state remains "running"
            _addEvent(arg)
            return
          case 'exception':
            _state = 'idle'
            _handleException(arg)
            return
          case 'finish-run':
            if (!_queue.length) {
              _state = 'idle'
              return
            }
            _state = 'scheduled'
            _runNextTick()
            return
        }
        break
      case 'paused':
        switch (event) {
          case 'add-event':
            _state = 'paused'
            _addEvent(arg)
            return
          case 'resume':
            _state = 'running'
            return
        }
        break
    }
  }

  function _addEvent(event) {
    _queue[_queue.length] = event
  }

  function _runNextTick() {
    nextTick(function() {
      _trigger('run-queue')
    })
  }

  function _runQueue() {
    // cache the number of events to process so that we don't
    // process any events that are added during this run.
    var eventsToProcess = _queue.length
    for (var i = 0; i < eventsToProcess; i++) {
      try {
        processEvent(_queue.shift())
      } catch (e) {
        _trigger('exception', e)
      }
    }
    _trigger('finish-run')
  }

  function _handleException(err) {
    _queue = []
    throw err
  }

  return {
    push: function push(event) {
      _trigger('add-event', event)
    },
    pause: function pause() {
      _trigger('pause')
    },
    resume: function resume() {
      _trigger('resume')
    },
    size: function size() {
      return _queue.length
    },
    purge: function purge() {
      _queue = []
    },
  }
}

export default createEventQueue

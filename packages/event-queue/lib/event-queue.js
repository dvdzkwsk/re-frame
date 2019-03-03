// prettier-ignore
var STATE_IDLE       = "IDLE",
    STATE_SCHEDULED  = "SCHEDULED",
    STATE_RUNNING    = "RUNNING",
    STATE_PAUSED     = "PAUSED",

    EVENT_PAUSE      = "PAUSE",
    EVENT_RESUME     = "RESUME",
    EVENT_ADD_EVENT  = "ADD_EVENT",
    EVENT_RUN_QUEUE  = "RUN_QUEUE",
    EVENT_EXCEPTION  = "EXCEPTION",
    EVENT_FINISH_RUN = "FINISH_RUN"

export function createEventQueue(processEvent) {
  var _queue = []
  var _state = STATE_IDLE

  function _trigger(event, arg) {
    switch (_state) {
      case STATE_IDLE:
        switch (event) {
          case EVENT_PAUSE:
            _state = STATE_PAUSED
            return
          case EVENT_ADD_EVENT:
            _state = STATE_SCHEDULED
            _addEvent(arg)
            _runNextTick()
            return
        }
        break
      case STATE_SCHEDULED:
        switch (event) {
          case EVENT_PAUSE:
            _state = STATE_PAUSED
            return
          case EVENT_ADD_EVENT:
            _addEvent(arg)
            return
          case EVENT_RUN_QUEUE:
            _state = STATE_RUNNING
            _runQueue()
            return
        }
        break
      case STATE_RUNNING:
        switch (event) {
          case EVENT_PAUSE:
            _state = STATE_PAUSED
            return
          case EVENT_ADD_EVENT:
            _addEvent(arg)
            return
          case EVENT_EXCEPTION:
            _state = STATE_IDLE
            _handleException(arg)
            return
          case EVENT_FINISH_RUN:
            if (!_queue.length) {
              _state = STATE_IDLE
              return
            }
            _state = STATE_SCHEDULED
            _runNextTick()
            return
        }
        break
      case STATE_PAUSED:
        switch (event) {
          case EVENT_ADD_EVENT:
            _addEvent(arg)
            return
          case EVENT_RESUME:
            _state = STATE_RUNNING
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
      _trigger(EVENT_RUN_QUEUE)
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
        _trigger(EVENT_EXCEPTION, e)
      }
    }
    _trigger(EVENT_FINISH_RUN)
  }

  function _handleException(err) {
    _queue = []
    throw err
  }

  return {
    push: function push(event) {
      _trigger(EVENT_ADD_EVENT, event)
    },
    pause: function pause() {
      _trigger(EVENT_PAUSE)
    },
    resume: function resume() {
      _trigger(EVENT_RESUME)
    },
    size: function size() {
      return _queue.length
    },
    purge: function purge() {
      _queue = []
    },
  }
}

var promise = Promise.resolve()
function nextTick(fn) {
  return promise.then(fn)
}

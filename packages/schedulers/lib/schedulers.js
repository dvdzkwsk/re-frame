export function synchronousScheduler(fn) {
  fn()
}

// createAnimationFrameScheduler creates a scheduler that schedules a function
// to be called on the next available animation frame. If the current window
// is inactive, the function is deferred until the window becomes active again.
// If multiple functions are scheduled while the window is inactive, only the
// last will be called when the scheduler resumes.
export function createAnimationFrameScheduler() {
  var _isWindowHidden = false
  var _lastScheduledFn
  subscribeToWindowState(function(hidden) {
    _isWindowHidden = hidden

    // If the current window transitions from hidden to visible, run the
    // last scheduled function immediately.
    if (!_isWindowHidden && _lastScheduledFn) {
      _lastScheduledFn()
      _lastScheduledFn = undefined
    }
  })
  return function animationFrameScheduler(fn) {
    if (_isWindowHidden) {
      _lastScheduledFn = fn
    } else {
      requestAnimationFrame(fn)
    }
  }
}

function subscribeToWindowState(callback) {
  // Browser detection taken from:
  // https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
  var hidden, visibilityChange
  if (typeof document.hidden !== "undefined") {
    hidden = "hidden"
    visibilityChange = "visibilitychange"
  } else if (typeof document.msHidden !== "undefined") {
    hidden = "msHidden"
    visibilityChange = "msvisibilitychange"
  } else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden"
    visibilityChange = "webkitvisibilitychange"
  }
  if (visibilityChange) {
    document.addEventListener(visibilityChange, function() {
      callback(document[hidden])
    })
  }
}

export function microTaskScheduler(fn) {
  Promise.resolve().then(fn)
}

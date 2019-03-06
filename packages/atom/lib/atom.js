var _notifyAtomDeref

/**
 * @typedef {object} Atom
 * @param {*} [initialValue]
 * @returns {Atom}
 */
export function atom(initialValue) {
  var _value = initialValue
  var _watchers = []

  function setValue(nextValue) {
    var prevValue = _value
    _value = nextValue
    for (var i = 0; i < _watchers.length; i++) {
      _watchers[i](prevValue, nextValue)
    }
  }

  var atom = {
    swap: function(fn) {
      setValue(fn(_value))
    },
    reset: function(value) {
      setValue(value)
    },
    dispose: function() {
      _watchers = []
      _value = undefined
    },
    deref: function() {
      if (_notifyAtomDeref) {
        _notifyAtomDeref(atom)
      }
      return _value
    },
    watch: function(watcher) {
      _watchers.push(watcher)
      return function() {
        _watchers = _watchers.filter(function(fn) {
          return fn !== watcher
        })
      }
    },
  }
  return atom
}

export function reaction(computation) {
  var watchers = []
  var ratom = atom()

  function notifyThisReactionOfDeref(atom) {
    if (watchers.indexOf(atom) === -1) {
      watchers.push(atom.watch(runReaction))
    }
  }

  function runReaction() {
    disposeWatchers()
    var notifyPreviousReactionOfDeref = _notifyAtomDeref
    _notifyAtomDeref = notifyThisReactionOfDeref
    ratom.reset(computation())
    _notifyAtomDeref = notifyPreviousReactionOfDeref
  }

  function disposeWatchers() {
    if (watchers.length) {
      for (var i = 0; i < watchers.length; i++) {
        watchers[i]()
      }
      watchers = []
    }
  }

  runReaction()
  ratom.dispose = disposeWatchers
  return ratom
}

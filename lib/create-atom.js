/**
 * @typedef {object} Atom
 * @param {*} [initialValue]
 * @returns {Atom}
 */
export function createAtom(initialValue) {
  var _value = initialValue
  var _watchers = []

  function setValue(nextValue) {
    var prevValue = _value
    _value = nextValue
    for (var i = 0; i < _watchers.length; i++) {
      _watchers[i](prevValue, nextValue)
    }
  }

  return {
    swap: function(fn) {
      setValue(fn(_value))
    },
    reset: function(value) {
      setValue(value)
    },
    deref: function() {
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
}

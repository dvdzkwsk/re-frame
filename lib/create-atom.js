function createAtom(initialValue) {
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
    swap: function swap(fn) {
      setValue(fn(_value))
    },
    reset: function reset(value) {
      setValue(value)
    },
    deref: function deref() {
      return _value
    },
    watch: function watch(watcher) {
      _watchers.push(watcher)
      return function unwatch() {
        _watchers = _watchers.filter(function(fn) {
          return fn !== watcher
        })
      }
    },
  }
}

export default createAtom

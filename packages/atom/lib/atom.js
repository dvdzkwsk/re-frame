/**
 * A "reaction" must know which atoms it depends on so that it can re-run when
 * any of those atoms change. To achieve this, a reaction assigns a function
 * to "_trackAtomInCurrentReaction" when it starts; then, all atom.deref() calls
 * invoke that function, passing a reference to the atom that was .deref()'d.
 */
var _trackAtomInCurrentReaction

/**
 * @typedef {object} Atom
 * @property {(*) => void} swap
 * @property {(*) => void} reset
 * @property {() => void} dispose
 * @property {() => *} deref
 * @property {((*) => void) => () => void} watch
 * @param {*} [initialValue]
 * @returns {Atom}
 */
export function atom(initialValue) {
  var _value = initialValue
  var _watchers = []

  function setValue(nextValue) {
    _value = nextValue
    for (var i = 0; i < _watchers.length; i++) {
      _watchers[i](nextValue)
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
      if (_trackAtomInCurrentReaction) {
        _trackAtomInCurrentReaction(atom)
      }
      return _value
    },
    watch: function(watcher) {
      _watchers.push(watcher)
      return function dispose() {
        var index = _watchers.indexOf(watcher)
        if (index !== -1) {
          _watchers.splice(index, 1)
        }
      }
    },
  }
  return atom
}

/**
 * Executes a computation and captures its return value in an atom (ratom).
 * Sets up watchers on all atoms that are .deref()'d while the computation
 * executes so that when any of those atoms change the computation re-executes
 * and updates the ratom's value.
 *
 * @param {Function} computation
 * @returns {Atom}
 */
export function reaction(computation) {
  var atoms = []
  var watchers = []
  var ratom = atom()

  function trackAtomInThisReaction(atom) {
    if (atoms.indexOf(atom) === -1) {
      atoms.push(atom)
      watchers.push(atom.watch(runReaction))
    }
  }

  function runReaction() {
    disposeReaction()
    var previousTracker = _trackAtomInCurrentReaction
    _trackAtomInCurrentReaction = trackAtomInThisReaction
    ratom.reset(computation())
    _trackAtomInCurrentReaction = previousTracker
  }

  function disposeReaction() {
    for (var i = 0; i < watchers.length; i++) {
      watchers[i]()
    }
    watchers = []
    atoms = []
  }

  runReaction()
  ratom.dispose = disposeReaction
  return ratom
}

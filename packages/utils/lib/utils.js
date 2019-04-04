var _hasOwnProperty = Object.prototype.hasOwnProperty

/**
 *  Shallowly clones the supplied object. Equivalent to `Object.assign`.
 */
export function shallowClone(target) {
  var res = {}
  for (var key in target) {
    if (_hasOwnProperty.call(target, key)) {
      res[key] = target[key]
    }
  }
  return res
}

/**
 * Immutably writes a value to a path inside an object.
 */
export function assoc(target, path, value) {
  if (typeof path === "string" || typeof path === "number") {
    path = [path]
  }

  var res = shallowClone(target)
  var curr = res
  for (var i = 0; i < path.length - 1; i++) {
    var key = path[i]
    curr[key] = shallowClone(curr[key])
    curr = curr[key]
  }
  curr[path[i]] = value
  return res
}

/**
 * Returns the value at `path` in `target`. Returns undefined if an
 * intermediate key does not exist.
 */
export function get(target, path) {
  if (typeof path === "string" || typeof path === "number") {
    path = [path]
  }

  for (var i = 0; i < path.length - 1; i++) {
    target = target[path[i]]
    if (!target) {
      break
    }
  }
  return target ? target[path[i]] : undefined
}

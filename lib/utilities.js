var _hasOwnProperty = Object.prototype.hasOwnProperty

/**
 * Shallowly clones the supplied object. Like `Object.assign`, it
 * only copies over the object's "ownProperties".
 *
 * @param {object} target - object to clone
 * @returns {object}
 */
export function shallowClone(target) {
  var clone = {}

  for (var key in target) {
    if (_hasOwnProperty.call(target, key)) {
      clone[key] = target[key]
    }
  }
  return clone
}

/**
 * Deeply flattens an array, removing all falsy values.
 * @param {array} arr - array to flatten
 * @returns {array}
 */
export function flatten(arr) {
  var flattened = []

  for (var i = 0; i < arr.length; i++) {
    var elem = arr[i]
    if (Array.isArray(elem)) {
      elem = flatten(elem)
      for (var j = 0; j < elem.length; j++) {
        flattened[flattened.length] = elem[j]
      }
    } else if (elem) {
      flattened[flattened.length] = elem
    }
  }
  return flattened
}

/**
 * Writes a value to a property inside an object. Does not mutate
 * the target object; instead, returns a shallow clone.
 *
 * @param {object} target - target object to assign the value to
 * @param {string} key - key to write the new value to in `target`
 * @param {*} value - value to write at `key`
 * @returns {object} object with the `value` updated at `key`
 */
export function assoc(target, key, value) {
  var clone = shallowClone(target)
  clone[key] = value
  return clone
}

/**
 * Like `assoc`, but writes a value to a property deep inside an object.
 * All objects along the way are shallowly cloned.
 * Note that the recursive implementation has been intentionally unrolled
 * into a loop for performance.
 *
 * @param {object} target - target object to assign the value to
 * @param {string[]} path - path to write the new value to in `target`
 * @param {*} value - value to write at `path`
 * @returns {object} object with the `value` updated at `path`
 */
export function assocPath(target, path, value) {
  var res = shallowClone(target)
  var obj = res

  for (var i = 0; i < path.length - 1; i++) {
    var key = path[i]
    obj[key] = shallowClone(obj[key])
    obj = obj[key]
  }
  obj[path[path.length - 1]] = value
  return res
}

/**
 * Invokes a callback with each own property of the supplied object.
 *
 * @param {object} obj - object to iterate over
 * @param {(value, key) => *} fn - callback to invoke for each own property
 * of `obj`. Called with the signature: (value, key).
 * @noreturn
 */
export function forOwn(obj, fn) {
  for (var key in obj) {
    if (_hasOwnProperty.call(obj, key)) {
      fn(obj[key], key)
    }
  }
}

var _hasOwnProperty = Object.prototype.hasOwnProperty

// Shallowly clones the supplied object. Like `Object.assign`, it
// only copies over the object's "ownProperties".
export function shallowClone(target) {
  var clone = {}

  for (var key in target) {
    if (_hasOwnProperty.call(target, key)) {
      clone[key] = target[key]
    }
  }
  return clone
}

// Deeply flattens an array.
export function flatten(arr) {
  var flattened = []

  for (var i = 0; i < arr.length; i++) {
    var elem = arr[i]
    if (Array.isArray(elem)) {
      elem = flatten(elem)
      for (var j = 0; j < elem.length; j++) {
        flattened[flattened.length] = elem[j]
      }
    } else {
      flattened[flattened.length] = elem
    }
  }
  return flattened
}

// Writes a value to a path inside an object. All objects along the way
// are shallowly cloned. Note that the recursive implementation has been
// intentionally unrolled into a loop for performance.
export function assoc(target, path, value) {
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

// Traverses an array of keys (path) in the target object, returning the value
// at the last key. If a key does not exist in the object, returns undefined.
export function getPath(target, path) {
  for (var i = 0; i < path.length; i++) {
    if (!target) {
      return undefined
    }
    target = target[path[i]]
  }
  return target
}

export var nextTick = setTimeout

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

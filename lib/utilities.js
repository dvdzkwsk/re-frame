/**
 * Deeply flattens an array, removing all falsy values.
 * @param {Array} xs - array to flatten
 * @returns {Array}
 */
export function flatten(xs) {
  const res = []
  for (let i = 0; i < xs.length; i++) {
    const val = xs[i]
    if (Array.isArray(val)) {
      const flattened = flatten(val)
      for (let j = 0; j < flattened.length; j++) {
        res[res.length] = flattened[j]
      }
    } else if (val) {
      res[res.length] = val
    }
  }
  return res
}

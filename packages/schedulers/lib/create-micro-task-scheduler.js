export function createMicroTaskScheduler() {
  var promise = Promise.resolve()
  return function scheduleMicroTask(fn) {
    promise.then(fn)
  }
}

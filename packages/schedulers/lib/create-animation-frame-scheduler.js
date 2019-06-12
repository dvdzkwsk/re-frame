export function createAnimationFrameScheduler() {
  return function scheduleAnimationFrame(fn) {
    requestAnimationFrame(fn)
  }
}

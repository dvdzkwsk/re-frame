export function synchronousScheduler(fn) {
  fn()
}

export function animationFrameScheduler(fn) {
  requestAnimationFrame(fn)
}

export function microTaskScheduler(fn) {
  Promise.resolve().then(fn)
}

/**
 * A DB handler receives the current db and event and return the new db state.
 * This interceptor wraps that handler so that its return value is
 * automatically applied to the "db" effect.
 *
 * @param {(db, event) => db} handler - DB event handler
 * @returns {Interceptor}
 */
export function dbHandlerToInterceptor(handler) {
  return {
    id: 'db-handler',
    before(context) {
      const {db, event} = context.coeffects
      return {
        ...context,
        effects: {
          ...context.effects,
          db: handler(db, event),
        },
      }
    },
  }
}

/**
 * An FX handler takes coeffects and returns effects. This interceptor wraps
 * that handler so that its return value is applied to the `effects`
 * property on context.
 *
 * @param {(cofx, event) => effects} handler - FX event handler
 * @returns {Interceptor}
 */
export function fxHandlerToInterceptor(handler) {
  return {
    id: 'fx-handler',
    before(context) {
      const {coeffects} = context
      return {
        ...context,
        effects: handler(coeffects, coeffects.event),
      }
    },
  }
}

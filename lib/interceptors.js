import {assocPath, assoc} from './utilities.js'

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
    before: function before(context) {
      var db = context.coeffects.db
      var event = context.coeffects.event
      return assocPath(context, ['effects', 'db'], handler(db, event))
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
    before: function before(context) {
      var coeffects = context.coeffects
      return assoc(context, 'effects', handler(coeffects, coeffects.event))
    },
  }
}

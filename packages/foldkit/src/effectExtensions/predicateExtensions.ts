import { Predicate } from 'effect'

export const isPlainObject = (
  value: unknown,
): value is Record<string, unknown> => {
  if (!Predicate.isObject(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)

  return prototype === Object.prototype || prototype === null
}

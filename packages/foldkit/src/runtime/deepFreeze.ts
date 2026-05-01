import { Array, Option, Predicate, Record } from 'effect'

/**
 * Recursively `Object.freeze`s a Model so accidental mutations throw a
 * `TypeError` at the write site with a clear stack trace, instead of silently
 * corrupting state or breaking reference-equality change detection.
 *
 * Scope: plain objects and arrays only. `Date`, `Map`, `Set`, `File`, class
 * instances, and Effect-tagged values such as `Option`, `Either`, `DateTime`,
 * `HashSet`, `HashMap`, and `Chunk` are returned untouched. Effect values rely
 * on `Hash.cached(this, ...)`, which lazily writes a memoized hash onto the
 * instance via `Object.defineProperty` on the first `Equal.equals` or
 * `Hash.hash` call. Freezing them would turn that legitimate write into a
 * `TypeError` on every subsequent equality check.
 *
 * `Option` is special-cased so nested plain payloads still get frozen:
 * `Option.some({ items: [...] })` walks into `.value` and freezes the inner
 * record, but returns the `Some` wrapper untouched.
 *
 * Idempotent: already-frozen values are returned as-is. This also serves as
 * the cycle-safety bailout and ensures amortized cost is O(diff) per update
 * when combined with `evo()` which preserves unchanged branches by reference.
 */
export const deepFreeze = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (Object.isFrozen(value)) {
    return value
  }

  if (Array.isArray(value)) {
    Object.freeze(value)
    value.forEach(deepFreeze)
    return value
  }

  if (Option.isOption(value)) {
    if (Option.isSome(value)) {
      deepFreeze(value.value)
    }
    return value
  }

  if (!isPlainObject(value)) {
    return value
  }

  Object.freeze(value)
  Record.values(value).forEach(deepFreeze)
  return value
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!Predicate.isObject(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

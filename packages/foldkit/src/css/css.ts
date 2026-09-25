/**
 * Unit functions that turn a number into one canonical CSS value string.
 *
 * Each function takes a number and returns a plain string: `Css.px(12)` is
 * `'12px'` and `Css.s(0.3 + 2 * 0.08)` is `'0.46s'`. Use the result anywhere
 * a CSS value string goes: an `h.Style` value, a template literal such as
 * `translate3d(...)` or `calc(...)`, or the expected value of `toHaveStyle`.
 * The names mirror the numeric factory functions of CSS Typed OM Level 1
 * (§4.3.5), such as `CSS.px()` and `CSS.percent()`, but they return strings,
 * not `CSSUnitValue` objects.
 *
 * The format keeps at most four decimal places and removes trailing zeros.
 * That removes floating-point noise, so `0.45999999999999996` is written
 * `'0.46'`. It also writes `-0` as `'0'`. Only magnitudes of at least `1e21`
 * use exponent form, as `String` does.
 *
 * The optional `step` rounds the value to the nearest multiple of the step
 * before the format runs. Use it to limit DOM writes. Foldkit skips a style
 * write when the string is unchanged, so while a value animates, a coarser
 * step means fewer writes and repaints.
 *
 * Every function throws an `Error` for a value that is not finite, for a step
 * that is not a finite number greater than 0, and for a rounded result that
 * is not finite. The message starts with `[foldkit] Css.<name>`.
 *
 * @example
 * ```typescript
 * h.Style({ transitionDelay: Css.s(0.3 + index * 0.08) })
 * ```
 *
 * @module
 */

const DECIMAL_PLACES = 4

/**
 * Options for every `Css` unit function.
 *
 * `step` rounds the value to the nearest multiple of `step` before formatting.
 * A value exactly halfway between two multiples rounds toward positive
 * infinity, as CSS `round(nearest, value, step)` does. The step must be a
 * finite number greater than 0.
 */
export type Options = Readonly<{
  /**
   * Rounds the value to the nearest multiple of `step` before formatting.
   * A value exactly halfway between two multiples rounds toward positive
   * infinity, so `Css.number(0.25, { step: 0.5 })` is `'0.5'` and
   * `Css.number(-0.25, { step: 0.5 })` is `'0'`. This is CSS
   * `round(nearest, value, step)` from CSS Values and Units Level 4. Most
   * decimal steps are not exact in binary, so a value that looks halfway can
   * sit just below the midpoint: `Css.number(0.15, { step: 0.1 })` is
   * `'0.1'`. The step must be a finite number greater than 0.
   *
   * @example
   * ```typescript
   * Css.number(dimAmount, { step: 0.01 })
   * ```
   */
  step?: number
}>

const format = (
  name: string,
  value: number,
  suffix: string,
  options: Options | undefined,
): string => {
  if (!Number.isFinite(value)) {
    throw new Error(
      `[foldkit] Css.${name} received ${String(value)}. CSS numeric values must be finite.`,
    )
  }

  const step = options?.step

  if (step !== undefined && !(Number.isFinite(step) && step > 0)) {
    throw new Error(
      `[foldkit] Css.${name} received step ${String(step)}. A step must be a finite number greater than 0.`,
    )
  }

  const rounded = step === undefined ? value : Math.round(value / step) * step

  if (!Number.isFinite(rounded)) {
    throw new Error(
      `[foldkit] Css.${name} cannot round ${String(value)} to step ${String(step)}. The rounded value is not finite.`,
    )
  }

  return `${String(Number(rounded.toFixed(DECIMAL_PLACES)))}${suffix}`
}

const makeUnitFunction =
  (name: string, suffix: string) =>
  (value: number, options?: Options): string =>
    format(name, value, suffix, options)

// UNITS

/**
 * Formats a unitless number, such as an `opacity` or a `scale()` factor.
 *
 * The result has at most four decimal places, with trailing zeros removed and
 * `-0` written as `0`. Throws an `Error` for a value that is not finite, for a
 * `step` that is not a finite number greater than 0, and for a rounded result
 * that is not finite.
 *
 * @example
 * ```typescript
 * Css.number(0.1 + 0.2) // '0.3'
 * ```
 */
export const number = makeUnitFunction('number', '')

/**
 * Formats a percentage.
 *
 * The result has at most four decimal places, with trailing zeros removed and
 * `-0` written as `0`. Throws an `Error` for a value that is not finite, for a
 * `step` that is not a finite number greater than 0, and for a rounded result
 * that is not finite.
 *
 * @example
 * ```typescript
 * Css.percent(100 / 3) // '33.3333%'
 * ```
 */
export const percent = makeUnitFunction('percent', '%')

/**
 * Formats a length in pixels.
 *
 * The result has at most four decimal places, with trailing zeros removed and
 * `-0` written as `0`. Throws an `Error` for a value that is not finite, for a
 * `step` that is not a finite number greater than 0, and for a rounded result
 * that is not finite.
 *
 * @example
 * ```typescript
 * Css.px(12) // '12px'
 * ```
 */
export const px = makeUnitFunction('px', 'px')

/**
 * Formats a length relative to the element's font size.
 *
 * The result has at most four decimal places, with trailing zeros removed and
 * `-0` written as `0`. Throws an `Error` for a value that is not finite, for a
 * `step` that is not a finite number greater than 0, and for a rounded result
 * that is not finite.
 *
 * @example
 * ```typescript
 * Css.em(1.5) // '1.5em'
 * ```
 */
export const em = makeUnitFunction('em', 'em')

/**
 * Formats a length relative to the root element's font size.
 *
 * The result has at most four decimal places, with trailing zeros removed and
 * `-0` written as `0`. Throws an `Error` for a value that is not finite, for a
 * `step` that is not a finite number greater than 0, and for a rounded result
 * that is not finite.
 *
 * @example
 * ```typescript
 * Css.rem(0.75) // '0.75rem'
 * ```
 */
export const rem = makeUnitFunction('rem', 'rem')

/**
 * Formats a length relative to the width of the `0` glyph.
 *
 * The result has at most four decimal places, with trailing zeros removed and
 * `-0` written as `0`. Throws an `Error` for a value that is not finite, for a
 * `step` that is not a finite number greater than 0, and for a rounded result
 * that is not finite.
 *
 * @example
 * ```typescript
 * Css.ch(60) // '60ch'
 * ```
 */
export const ch = makeUnitFunction('ch', 'ch')

/**
 * Formats a length relative to 1% of the viewport width.
 *
 * The result has at most four decimal places, with trailing zeros removed and
 * `-0` written as `0`. Throws an `Error` for a value that is not finite, for a
 * `step` that is not a finite number greater than 0, and for a rounded result
 * that is not finite.
 *
 * @example
 * ```typescript
 * Css.vw(50) // '50vw'
 * ```
 */
export const vw = makeUnitFunction('vw', 'vw')

/**
 * Formats a length relative to 1% of the viewport height.
 *
 * The result has at most four decimal places, with trailing zeros removed and
 * `-0` written as `0`. Throws an `Error` for a value that is not finite, for a
 * `step` that is not a finite number greater than 0, and for a rounded result
 * that is not finite.
 *
 * @example
 * ```typescript
 * Css.vh(100) // '100vh'
 * ```
 */
export const vh = makeUnitFunction('vh', 'vh')

/**
 * Formats a length relative to 1% of the smaller viewport dimension.
 *
 * The result has at most four decimal places, with trailing zeros removed and
 * `-0` written as `0`. Throws an `Error` for a value that is not finite, for a
 * `step` that is not a finite number greater than 0, and for a rounded result
 * that is not finite.
 *
 * @example
 * ```typescript
 * Css.vmin(10) // '10vmin'
 * ```
 */
export const vmin = makeUnitFunction('vmin', 'vmin')

/**
 * Formats a length relative to 1% of the larger viewport dimension.
 *
 * The result has at most four decimal places, with trailing zeros removed and
 * `-0` written as `0`. Throws an `Error` for a value that is not finite, for a
 * `step` that is not a finite number greater than 0, and for a rounded result
 * that is not finite.
 *
 * @example
 * ```typescript
 * Css.vmax(10) // '10vmax'
 * ```
 */
export const vmax = makeUnitFunction('vmax', 'vmax')

/**
 * Formats a flexible length for a grid track.
 *
 * The result has at most four decimal places, with trailing zeros removed and
 * `-0` written as `0`. Throws an `Error` for a value that is not finite, for a
 * `step` that is not a finite number greater than 0, and for a rounded result
 * that is not finite.
 *
 * @example
 * ```typescript
 * Css.fr(2) // '2fr'
 * ```
 */
export const fr = makeUnitFunction('fr', 'fr')

/**
 * Formats an angle in degrees.
 *
 * The result has at most four decimal places, with trailing zeros removed and
 * `-0` written as `0`. Throws an `Error` for a value that is not finite, for a
 * `step` that is not a finite number greater than 0, and for a rounded result
 * that is not finite.
 *
 * @example
 * ```typescript
 * Css.deg(45) // '45deg'
 * ```
 */
export const deg = makeUnitFunction('deg', 'deg')

/**
 * Formats an angle in radians.
 *
 * The result has at most four decimal places, with trailing zeros removed and
 * `-0` written as `0`. Throws an `Error` for a value that is not finite, for a
 * `step` that is not a finite number greater than 0, and for a rounded result
 * that is not finite.
 *
 * @example
 * ```typescript
 * Css.rad(Math.PI) // '3.1416rad'
 * ```
 */
export const rad = makeUnitFunction('rad', 'rad')

/**
 * Formats an angle in turns, where `1turn` is a full circle.
 *
 * The result has at most four decimal places, with trailing zeros removed and
 * `-0` written as `0`. Throws an `Error` for a value that is not finite, for a
 * `step` that is not a finite number greater than 0, and for a rounded result
 * that is not finite.
 *
 * @example
 * ```typescript
 * Css.turn(0.25) // '0.25turn'
 * ```
 */
export const turn = makeUnitFunction('turn', 'turn')

/**
 * Formats a time in seconds.
 *
 * The result has at most four decimal places, with trailing zeros removed and
 * `-0` written as `0`. Throws an `Error` for a value that is not finite, for a
 * `step` that is not a finite number greater than 0, and for a rounded result
 * that is not finite.
 *
 * @example
 * ```typescript
 * Css.s(0.3 + 2 * 0.08) // '0.46s'
 * ```
 */
export const s = makeUnitFunction('s', 's')

/**
 * Formats a time in milliseconds.
 *
 * The result has at most four decimal places, with trailing zeros removed and
 * `-0` written as `0`. Throws an `Error` for a value that is not finite, for a
 * `step` that is not a finite number greater than 0, and for a rounded result
 * that is not finite.
 *
 * @example
 * ```typescript
 * Css.ms(150) // '150ms'
 * ```
 */
export const ms = makeUnitFunction('ms', 'ms')

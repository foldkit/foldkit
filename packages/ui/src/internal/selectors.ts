const NULL_CHARACTER_CODE = 0
const REPLACEMENT_CHARACTER = '�'
const DELETE_CHARACTER_CODE = 0x7f
const MAX_CONTROL_CHARACTER_CODE = 0x1f
const DIGIT_ZERO_CODE = 0x30
const DIGIT_NINE_CODE = 0x39
const HYPHEN_CODE = 0x2d
const UNDERSCORE_CODE = 0x5f
const UPPERCASE_A_CODE = 0x41
const UPPERCASE_Z_CODE = 0x5a
const LOWERCASE_A_CODE = 0x61
const LOWERCASE_Z_CODE = 0x7a
const FIRST_NON_ASCII_CODE = 0x80

const isDigitCode = (code: number): boolean =>
  code >= DIGIT_ZERO_CODE && code <= DIGIT_NINE_CODE

const isIdentifierCode = (code: number): boolean =>
  code >= FIRST_NON_ASCII_CODE ||
  isDigitCode(code) ||
  code === HYPHEN_CODE ||
  code === UNDERSCORE_CODE ||
  (code >= UPPERCASE_A_CODE && code <= UPPERCASE_Z_CODE) ||
  (code >= LOWERCASE_A_CODE && code <= LOWERCASE_Z_CODE)

// NOTE: the CSS.escape algorithm from the CSSOM spec, implemented locally
// because `CSS` is a browser global and selector building runs during view
// construction, which also happens under server rendering in Node.
const escapeCssIdentifier = (value: string): string => {
  const firstCode = value.charCodeAt(0)
  let escaped = ''
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    const character = value.charAt(index)
    if (code === NULL_CHARACTER_CODE) {
      escaped += REPLACEMENT_CHARACTER
    } else if (
      (code >= 1 && code <= MAX_CONTROL_CHARACTER_CODE) ||
      code === DELETE_CHARACTER_CODE ||
      (isDigitCode(code) &&
        (index === 0 || (index === 1 && firstCode === HYPHEN_CODE)))
    ) {
      escaped += `\\${code.toString(16)} `
    } else if (index === 0 && code === HYPHEN_CODE && value.length === 1) {
      escaped += `\\${character}`
    } else if (isIdentifierCode(code)) {
      escaped += character
    } else {
      escaped += `\\${character}`
    }
  }
  return escaped
}

/**
 * Builds a CSS id selector from an element's id value.
 *
 * The id is escaped per the `CSS.escape` algorithm so values that are not
 * valid CSS identifiers on their own (most notably ids beginning with a
 * digit, as produced by UUID-prefixed ids) still yield a usable selector.
 * The escape is implemented locally rather than via the `CSS` browser
 * global so views that build selectors also render under Node.
 */
export const idSelector = (id: string): string => `#${escapeCssIdentifier(id)}`

/**
 * Builds a CSS attribute selector matching `attribute` against `value`.
 *
 * The value is quoted and escaped per the `CSS.escape` algorithm, so values
 * carrying brackets, backslashes, spaces, or a leading digit still yield a
 * usable selector. The quotes are load bearing: an escaped value is a valid
 * CSS identifier but not a valid unquoted attribute value, so dropping them
 * makes selectors for digit-leading ids fail to parse. The escape is the
 * same local implementation `idSelector` uses, so attribute selectors also
 * build under Node during server rendering.
 */
export const attributeSelector = (attribute: string, value: string): string =>
  `[${attribute}="${escapeCssIdentifier(value)}"]`

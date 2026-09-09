import { String as String_ } from 'effect'

const value = String(42)
const isValue = String_.isNonEmpty(value)

export { isValue, value }

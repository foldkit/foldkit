import { String as String_ } from 'effect'

const check = (String: string) => String_.isNonEmpty(String)

export { check }

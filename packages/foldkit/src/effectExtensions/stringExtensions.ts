import { Option, String, flow } from 'effect'

import { fromString } from './optionExtensions.js'

export const stripPrefix = (prefix: string) =>
  flow(
    Option.liftPredicate(String.startsWith(prefix)),
    Option.map(String.slice(prefix.length)),
  )

export const stripPrefixNonEmpty = (prefix: string) =>
  flow(stripPrefix(prefix), Option.flatMap(fromString))

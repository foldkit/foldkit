import { Option, String, flow } from 'effect'

export const stripPrefix = (prefix: string) =>
  flow(
    Option.liftPredicate(String.startsWith(prefix)),
    Option.map(String.slice(prefix.length)),
  )

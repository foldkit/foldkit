import { Number, Option, Record, pipe } from 'effect'
import { Cookies } from 'effect/unstable/http'

export const COUNT_COOKIE = 'count'

export const readCountCookie = (cookieHeader: string): number =>
  pipe(
    Cookies.parseHeader(cookieHeader),
    Record.get(COUNT_COOKIE),
    Option.flatMap(Number.parse),
    Option.filter(globalThis.Number.isSafeInteger),
    Option.getOrElse(() => 0),
  )

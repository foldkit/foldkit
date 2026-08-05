import {
  Array,
  Number as Number_,
  Option,
  String as String_,
  pipe,
} from 'effect'

export const COUNT_COOKIE = 'foldkit-ssr-count'

const COUNT_COOKIE_PREFIX = `${COUNT_COOKIE}=`

export const readCountCookie = (cookieHeader: string): number =>
  pipe(
    cookieHeader,
    String_.split(';'),
    Array.map(String_.trim),
    Array.findFirst(String_.startsWith(COUNT_COOKIE_PREFIX)),
    Option.map(String_.slice(COUNT_COOKIE_PREFIX.length)),
    Option.flatMap(Number_.parse),
    Option.filter(Number.isSafeInteger),
    Option.getOrElse(() => 0),
  )

import {
  Effect,
  Option,
  Schema,
  SchemaIssue,
  SchemaTransformation,
  String,
} from 'effect'

import { OptionExt } from '../effectExtensions/index.js'

/** Schema representing a parsed URL with protocol, host, port, pathname, search, and hash fields. `search` and `hash` are `Option.none()` when the URL has no query or fragment, and `Option.some('')` when it has an empty one, as in `/docs?` or `/docs#`. */
export const Url = Schema.Struct({
  protocol: Schema.String,
  host: Schema.String,
  port: Schema.Option(Schema.String),
  pathname: Schema.String,
  search: Schema.Option(Schema.String),
  hash: Schema.Option(Schema.String),
})
export type Url = typeof Url.Type

const LocationAndHref = Schema.Struct({
  href: Schema.String,
  location: Schema.Struct({
    protocol: Schema.String,
    host: Schema.String,
    port: Schema.String,
  }),
})

const SEARCH_OR_HASH_SEPARATOR = /[?#]/

const toLocationAndHref = (url: URL): typeof LocationAndHref.Type => {
  // NOTE: `URL.search` and `URL.hash` are `''` both for a missing part and for
  // an empty one. Only the serialized `href` keeps a lone `?` or `#`. The first
  // `?` or `#` in `href` starts the query or the fragment, because the URL
  // serializer percent-encodes both characters everywhere before that point.
  const searchAndHash = Option.match(
    String.search(url.href, SEARCH_OR_HASH_SEPARATOR),
    {
      onNone: () => '',
      onSome: separatorIndex => url.href.slice(separatorIndex),
    },
  )

  return {
    href: `${url.pathname}${searchAndHash}`,
    location: {
      protocol: url.protocol,
      host: url.hostname,
      port: url.port,
    },
  }
}

const LocationAndHrefFromString = Schema.String.pipe(
  Schema.decodeTo(
    LocationAndHref,
    SchemaTransformation.transformEffect({
      decode: urlString =>
        Effect.try({
          try: () => toLocationAndHref(new URL(urlString)),
          catch: () =>
            new SchemaIssue.InvalidValue({
              message: `Invalid URL: ${urlString}`,
            }),
        }),
      encode: ({ href, location }) => {
        const portString = location.port ? `:${location.port}` : ''
        return Effect.succeed(
          `${location.protocol}//${location.host}${portString}${href}`,
        )
      },
    }),
  ),
)

const splitOnFirst = (
  value: string,
  separator: string,
): readonly [string, Option.Option<string>] =>
  Option.match(String.indexOf(separator)(value), {
    onNone: () => [value, Option.none()],
    onSome: separatorIndex => [
      String.substring(0, separatorIndex)(value),
      Option.some(String.substring(separatorIndex + separator.length)(value)),
    ],
  })

const UrlFromLocationAndHref = LocationAndHref.pipe(
  Schema.decodeTo(
    Url,
    SchemaTransformation.transform({
      decode: ({ href, location }) => {
        const [pathAndQuery, maybeHash] = splitOnFirst(href, '#')
        const [pathname, maybeSearch] = splitOnFirst(pathAndQuery, '?')

        return {
          protocol: location.protocol,
          host: location.host,
          port: OptionExt.fromString(location.port),
          pathname: pathname || '/',
          search: maybeSearch,
          hash: maybeHash,
        }
      },
      encode: url => {
        const search = Option.match(url.search, {
          onNone: () => '',
          onSome: s => `?${s}`,
        })
        const hash = Option.match(url.hash, {
          onNone: () => '',
          onSome: h => `#${h}`,
        })
        const href = `${url.pathname}${search}${hash}`

        return {
          href,
          location: {
            protocol: url.protocol,
            host: url.host,
            port: Option.getOrElse(url.port, () => ''),
          },
        }
      },
    }),
  ),
)

const UrlFromString = LocationAndHrefFromString.pipe(
  Schema.decodeTo(UrlFromLocationAndHref),
)

export const fromWhatwgUrl = (url: URL): Url =>
  Schema.decodeSync(UrlFromLocationAndHref)(toLocationAndHref(url))

/** Parses a URL string into a `Url`, returning `Option.None` if invalid. */
export const fromString = (str: string) =>
  Schema.decodeOption(UrlFromString)(str)
/** Serializes a `Url` back to a string. */
export const toString = (url: Url) => Schema.encodeSync(UrlFromString)(url)

import {
  Effect,
  Option,
  Schema as S,
  SchemaIssue,
  SchemaTransformation,
  String,
} from 'effect'

import { OptionExt } from '../effectExtensions/index.js'

/** Schema representing a parsed URL with protocol, host, port, pathname, search, and hash fields. */
export const Url = S.Struct({
  protocol: S.String,
  host: S.String,
  port: S.Option(S.String),
  pathname: S.String,
  search: S.Option(S.String),
  hash: S.Option(S.String),
})
export type Url = typeof Url.Type

const LocationAndHref = S.Struct({
  href: S.String,
  location: S.Struct({
    protocol: S.String,
    host: S.String,
    port: S.String,
  }),
})

const LocationAndHrefFromString = S.String.pipe(
  S.decodeTo(
    LocationAndHref,
    SchemaTransformation.transformOrFail({
      decode: urlString =>
        Effect.try({
          try: () => {
            const url = new URL(urlString)
            return {
              href: `${url.pathname}${url.search}${url.hash}`,
              location: {
                protocol: url.protocol,
                host: url.hostname,
                port: url.port,
              },
            }
          },
          catch: () =>
            new SchemaIssue.InvalidValue(Option.some(urlString), {
              description: `Invalid URL: ${urlString}`,
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

const UrlFromLocationAndHref = LocationAndHref.pipe(
  S.decodeTo(
    Url,
    SchemaTransformation.transform({
      decode: ({ href, location }) => {
        const [pathAndQuery, hashPart] = String.split(href, '#')
        const [pathname, searchPart] = String.split(pathAndQuery, '?')

        return {
          protocol: location.protocol,
          host: location.host,
          port: OptionExt.fromString(location.port),
          pathname: pathname || '/',
          search: OptionExt.fromString(searchPart || ''),
          hash: OptionExt.fromString(hashPart || ''),
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
  S.decodeTo(UrlFromLocationAndHref),
)

/** Parses a URL string into a `Url`, returning `Option.None` if invalid. */
export const fromString = (str: string) => S.decodeOption(UrlFromString)(str)
/** Serializes a `Url` back to a string. */
export const toString = (url: Url) => S.encodeSync(UrlFromString)(url)

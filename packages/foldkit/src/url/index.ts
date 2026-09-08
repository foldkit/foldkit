import {
  Effect,
  Option,
  Schema,
  SchemaIssue,
  SchemaTransformation,
  String,
} from 'effect'

import { OptionExt } from '../effectExtensions/index.js'

/** Schema representing a parsed URL with protocol, host, port, pathname, search, and hash fields. */
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

const LocationAndHrefFromString = Schema.String.pipe(
  Schema.decodeTo(
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

const UrlFromLocationAndHref = LocationAndHref.pipe(
  Schema.decodeTo(
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
  Schema.decodeTo(UrlFromLocationAndHref),
)

/** Parses a URL string into a `Url`, returning `Option.None` if invalid. */
export const fromString = (str: string) =>
  Schema.decodeOption(UrlFromString)(str)
/** Serializes a `Url` back to a string. */
export const toString = (url: Url) => Schema.encodeSync(UrlFromString)(url)

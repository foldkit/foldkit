import {
  Effect,
  Option,
  Schema,
  SchemaIssue,
  SchemaTransformation,
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

const UrlFromString = Schema.String.pipe(
  Schema.decodeTo(
    Url,
    SchemaTransformation.transformEffect({
      decode: urlString =>
        Effect.try({
          try: () => {
            const url = new URL(urlString)

            return {
              protocol: url.protocol,
              host: url.hostname,
              port: OptionExt.fromString(url.port),
              pathname: url.pathname || '/',
              search: OptionExt.fromString(url.search.slice(1)),
              hash: OptionExt.fromString(url.hash.slice(1)),
            }
          },
          catch: () =>
            new SchemaIssue.InvalidValue({
              message: `Invalid URL: ${urlString}`,
            }),
        }),
      encode: url => {
        const port = Option.getOrElse(url.port, () => '')
        const portString = port ? `:${port}` : ''
        const search = Option.match(url.search, {
          onNone: () => '',
          onSome: search => `?${search}`,
        })
        const hash = Option.match(url.hash, {
          onNone: () => '',
          onSome: hash => `#${hash}`,
        })

        return Effect.succeed(
          `${url.protocol}//${url.host}${portString}${url.pathname}${search}${hash}`,
        )
      },
    }),
  ),
)
type UrlFromString = typeof UrlFromString.Type

/**
 * Parses a URL string into a `Url`, returning `Option.None` if invalid.
 * Preserves the complete query and fragment after their first delimiters.
 */
export const fromString = (str: string) =>
  Schema.decodeOption(UrlFromString)(str)
/** Serializes a `Url` back to a string. */
export const toString = (url: Url) => Schema.encodeSync(UrlFromString)(url)

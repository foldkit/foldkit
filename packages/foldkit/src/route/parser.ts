import {
  Array,
  Data,
  Effect,
  Option,
  Predicate,
  Record,
  Schema,
  String,
  flow,
  pipe,
} from 'effect'

import { Url } from '../url/index.js'

/**
 * Error type for route parsing failures.
 *
 * Includes optional `expected`, `actual`, and `position` fields for
 * diagnostic context when a URL segment does not match.
 */
export class ParseError extends Data.TaggedError('ParseError')<{
  readonly message: string
  readonly expected?: string
  readonly actual?: string
  readonly position?: number
}> {}

/**
 * The result of parsing: a tuple of the parsed value and remaining URL segments.
 */
export type ParseResult<A> = [A, ReadonlyArray<string>]

type PrintState = {
  segments: ReadonlyArray<string>
  queryParams: URLSearchParams
}

/**
 * A bidirectional parser that can both parse URL segments into a value
 * and print a value back to URL segments.
 */
export type Biparser<A> = {
  parse: (
    segments: ReadonlyArray<string>,
    search?: string,
  ) => Effect.Effect<ParseResult<A>, ParseError>
  print: (value: A, state: PrintState) => Effect.Effect<PrintState, ParseError>
}

type BuildFn<A> = A extends { _tag: string }
  ? keyof Omit<A, '_tag'> extends never
    ? (value?: Omit<A, '_tag'>) => string
    : (value: Omit<A, '_tag'>) => string
  : never

/**
 * A parser with a `build` method that can reconstruct URLs from parsed values.
 *
 * Created by applying `mapTo` to a `Biparser`, binding it to a tagged
 * type constructor so parsed values carry a discriminant tag and URLs can be
 * built from tag payloads.
 *
 * Routers are callable — `homeRouter()` or `personRouter({ id: 42 })` —
 * and also expose `.build` as an alias and `.parse` for URL matching.
 */
export type Router<A> = BuildFn<A> & {
  parse: (
    segments: ReadonlyArray<string>,
    search?: string,
  ) => Effect.Effect<ParseResult<A>, ParseError>
  build: BuildFn<A>
}

/**
 * A `Biparser` that has been terminated (e.g. by `query` or `rest`)
 * and cannot be extended with `slash`.
 */
export type TerminalParser<A> = Biparser<A> & { readonly __terminal: true }

/**
 * A `Biparser` that can still be extended with `slash`. Terminal parsers
 * (`query`, `rest`) do not qualify, since nothing can follow them in
 * the path.
 */
export type ExtendableBiparser<A> = Biparser<A> & {
  readonly __terminal?: never
  readonly 'Cannot use slash after a terminal parser - nothing can follow query or rest'?: never
}

const makeTerminalParser = <A>(parser: Biparser<A>): TerminalParser<A> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  parser as TerminalParser<A>

const pathToSegments = flow(String.split('/'), Array.filter(String.isNonEmpty))

const DOT_SEGMENTS: ReadonlyArray<string> = ['.', '..']

type SegmentDescription = Readonly<{
  label: string
  expected: string
}>

type SingleSegment<A> = SegmentDescription &
  Readonly<{
    parse: (value: string) => Effect.Effect<A, ParseError>
    print: (value: A) => Effect.Effect<string, ParseError>
  }>

const decodeSegment = (
  { label, expected }: SegmentDescription,
  segment: string,
): Effect.Effect<string, ParseError> =>
  Effect.try({
    try: () => decodeURIComponent(segment),
    catch: () =>
      new ParseError({
        message: `Malformed percent-encoding in ${label}`,
        expected: `percent-encoded segment (${expected})`,
        actual: segment,
        position: 0,
      }),
  })

const encodeSegment = (
  { label, expected }: SegmentDescription,
  value: string,
): Effect.Effect<string, ParseError> => {
  if (String.isEmpty(value)) {
    return Effect.fail(
      new ParseError({
        message: `Expected a non-empty segment for ${label}`,
        expected: `non-empty segment (${expected})`,
        actual: 'empty string',
      }),
    )
  } else if (Array.contains(DOT_SEGMENTS, value)) {
    return Effect.fail(
      new ParseError({
        message: `Expected a segment other than '.' or '..' for ${label}`,
        expected: `segment other than '.' or '..' (${expected})`,
        actual: value,
      }),
    )
  } else {
    return Effect.try({
      try: () => encodeURIComponent(value),
      catch: () =>
        new ParseError({
          message: `Expected well-formed Unicode for ${label}`,
          expected: `well-formed Unicode segment (${expected})`,
          actual: value,
        }),
    })
  }
}

const singleSegment = <A>(definition: SingleSegment<A>): Biparser<A> => ({
  parse: segments =>
    Array.matchLeft(segments, {
      onEmpty: () =>
        Effect.fail(
          new ParseError({
            message: `Expected ${definition.label}`,
            expected: definition.expected,
            actual: 'end of path',
            position: 0,
          }),
        ),
      onNonEmpty: (head, tail) =>
        pipe(
          decodeSegment(definition, head),
          Effect.flatMap(definition.parse),
          Effect.map(value => [value, tail]),
        ),
    }),
  print: (value, state) =>
    pipe(
      definition.print(value),
      Effect.flatMap(segmentValue => encodeSegment(definition, segmentValue)),
      Effect.map(segment => ({
        ...state,
        segments: [...state.segments, segment],
      })),
    ),
})

/**
 * Creates a parser that matches an exact URL path segment.
 *
 * The segment is compared with the percent-decoded URL segment and
 * percent-encoded when printing, so `literal('café')` matches and builds
 * `/caf%C3%A9`. The whole string is one segment: a slash inside it prints as
 * `%2F`. Join several segments with `slash` instead.
 *
 * @example
 * ```ts
 * literal('users') // matches /users
 * ```
 */
export const literal = (segment: string): Biparser<{}> =>
  singleSegment({
    label: `'${segment}'`,
    expected: segment,
    parse: value =>
      value === segment
        ? Effect.succeed({})
        : Effect.fail(
            new ParseError({
              message: `Expected '${segment}'`,
              expected: segment,
              actual: value,
              position: 0,
            }),
          ),
    print: () => Effect.succeed(segment),
  })

/**
 * Creates a parser for a dynamic URL segment with custom parse and print functions.
 *
 * `parse` receives the percent-decoded segment, and the string `print`
 * returns is percent-encoded into the URL, so any value round-trips as one
 * segment, including one that contains `/`, `?`, `#`, `%`, spaces, or
 * non-ASCII text. A URL segment with a malformed percent escape does not
 * match. Building a URL fails when `print` returns an empty string, `.`, or
 * `..`, because no URL segment parses back to those values.
 *
 * @param label - A descriptive name used in error messages.
 * @param parse - Converts the decoded URL segment into the parsed value.
 * @param print - Converts the parsed value back into the unencoded segment.
 */
export const param = <A>(
  label: string,
  parse: (segment: string) => Effect.Effect<A, ParseError>,
  print: (value: A) => string,
): Biparser<A> =>
  singleSegment({
    label,
    expected: label,
    parse,
    print: value => Effect.succeed(print(value)),
  })

/**
 * Creates a parser that captures a URL segment as a named string field.
 *
 * The value is percent-decoded when parsing and percent-encoded when
 * building, as described on `param`.
 *
 * @example
 * ```ts
 * string('slug') // parses /hello into { slug: "hello" }
 * string('slug') // parses /a%2Fb into { slug: "a/b" }
 * ```
 */
export const string = <K extends string>(
  name: K,
): Biparser<Record<K, string>> =>
  param(
    `string (${name})`,
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    segment => Effect.succeed({ [name]: segment } as Record<K, string>),
    record => record[name],
  )

/**
 * Creates a parser that captures a URL segment as a named integer field.
 *
 * Fails if the segment is not a valid integer.
 *
 * @example
 * ```ts
 * int('id') // parses /42 into { id: 42 }
 * ```
 */
export const int = <K extends string>(name: K): Biparser<Record<K, number>> =>
  param(
    `integer (${name})`,
    segment => {
      const parsed = parseInt(segment, 10)

      return isNaN(parsed) || parsed.toString() !== segment
        ? Effect.fail(
            new ParseError({
              message: `Expected integer for ${name}`,
              expected: 'integer',
              actual: segment,
            }),
          )
        : /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          Effect.succeed({ [name]: parsed } as Record<K, number>)
    },
    record => record[name].toString(),
  )

/**
 * Creates a parser that captures a URL segment and decodes it through an
 * Effect `Schema`, producing a named field of the schema's decoded type.
 *
 * Decodes the percent-decoded segment when parsing and encodes the value back
 * when printing, so branded ids, refined strings, and string-literal unions
 * round-trip through the route. The decoded type flows straight into the
 * route value, so a model carries `UserId` rather than a bare `string`.
 *
 * The schema's encoded string is percent-encoded into one URL segment, as
 * described on `param`, so an encoded value containing `/` stays one
 * segment. For shapes that span multiple segments or live in the query
 * string, use `rest` or `query`.
 *
 * @example
 * ```ts
 * const UserId = Schema.String.pipe(Schema.brand('UserId'))
 * pipe(literal('users'), slash(schemaSegment('userId', UserId)), mapTo(UserRoute))
 * // parses /users/abc into { _tag: 'UserRoute', userId: UserId.make('abc') }
 * ```
 *
 * @param name - The field name the decoded value is captured under.
 * @param schema - A codec whose encoded form is a string.
 */
export const schemaSegment = <K extends string, A, I extends string>(
  name: K,
  schema: Schema.Codec<A, I>,
): Biparser<Record<K, A>> => {
  const decode = Schema.decodeUnknownEffect(schema)
  const encode = Schema.encodeEffect(schema)

  return singleSegment({
    label: name,
    expected: name,
    parse: segment =>
      pipe(
        segment,
        decode,
        Effect.mapError(
          error =>
            new ParseError({
              message: `Invalid ${name}: ${error.message}`,
              expected: name,
              actual: segment,
            }),
        ),
        Effect.map(value => Record.singleton(name, value)),
      ),
    print: value =>
      pipe(
        value[name],
        encode,
        Effect.mapError(
          error =>
            new ParseError({
              message: `Failed to encode ${name}: ${error.message}`,
            }),
        ),
      ),
  })
}

/**
 * A parser that matches the root path with no remaining segments.
 *
 * Succeeds only when the URL path is exactly `/`.
 */
export const root: Biparser<{}> = {
  parse: segments =>
    Array.matchLeft(segments, {
      onEmpty: () => Effect.succeed([{}, []]),
      onNonEmpty: (_, tail) =>
        Effect.fail(
          new ParseError({
            message: 'Expected root path',
            expected: 'root path',
            actual: `${tail.length + 1} remaining segments`,
          }),
        ),
    }),
  print: (_, state) => Effect.succeed(state),
}

/**
 * Creates a parser that captures all remaining URL segments as a named
 * non-empty array field.
 *
 * Requires at least one remaining segment. A bare prefix like `/files`
 * does not match; give it its own route alongside the rest route.
 *
 * A rest route also matches every URL that a more specific route under
 * the same prefix accepts, so in `oneOf` the specific route must come
 * first.
 *
 * Nothing can follow `rest` in the path, so the result is a
 * `TerminalParser`. It can still be extended with `query`.
 *
 * @example
 * ```ts
 * pipe(literal('files'), slash(rest('path')))
 * // parses /files/documents/taxes/2024.pdf
 * // into { path: ['documents', 'taxes', '2024.pdf'] }
 * ```
 */
export const rest = <K extends string>(
  name: K,
): TerminalParser<Record<K, Array.NonEmptyReadonlyArray<string>>> => {
  const parser: Biparser<Record<K, Array.NonEmptyReadonlyArray<string>>> = {
    parse: segments =>
      Array.match(segments, {
        onEmpty: () =>
          Effect.fail(
            new ParseError({
              message: `Expected remaining segments (${name})`,
              expected: `remaining segments (${name})`,
              actual: 'end of path',
              position: 0,
            }),
          ),
        onNonEmpty: remainingSegments =>
          Effect.succeed([
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            { [name]: remainingSegments } as Record<
              K,
              Array.NonEmptyReadonlyArray<string>
            >,
            [],
          ]),
      }),
    print: (value, state) =>
      Effect.succeed({
        ...state,
        segments: [...state.segments, ...value[name]],
      }),
  }
  return makeTerminalParser(parser)
}

const isNormalizedPath = (path: string): boolean =>
  String.isNonEmpty(path) && Array.join(pathToSegments(path), '/') === path

/**
 * Creates a parser that captures all remaining URL segments as a single
 * named string field, preserving the slashes between them.
 *
 * Where `rest` yields a `NonEmptyArray` of segments, `restString` rejoins
 * the tail into one raw path string, so a value that itself contains both
 * slashes and dots, like a repository-relative file path
 * `documents/taxes/2024.pdf`, round-trips through the bidirectional router
 * as `{ path: string }` route data.
 *
 * Requires at least one remaining segment. A bare prefix like `/vault`
 * does not match; give it its own route alongside the restString route.
 *
 * A restString route also matches every URL that a more specific route under
 * the same prefix accepts, so in `oneOf` the specific route must come first.
 *
 * Printing requires a normalized path: non-empty, with no leading,
 * trailing, or repeated slashes. Any other value would build a URL that
 * parses back differently, so printing fails instead of building it.
 *
 * Nothing can follow `restString` in the path, so the result is a
 * `TerminalParser`. It can still be extended with `query`.
 *
 * @example
 * ```ts
 * pipe(literal('vault'), slash(restString('path')))
 * // parses /vault/a/b/c.md   into { path: 'a/b/c.md' }
 * // builds { path: 'a/b/c.md' } into /vault/a/b/c.md
 * ```
 */
export const restString = <K extends string>(
  name: K,
): TerminalParser<Record<K, string>> => {
  const parser: Biparser<Record<K, string>> = {
    parse: segments =>
      Array.match(segments, {
        onEmpty: () =>
          Effect.fail(
            new ParseError({
              message: `Expected remaining path (${name})`,
              expected: `remaining path (${name})`,
              actual: 'end of path',
              position: 0,
            }),
          ),
        onNonEmpty: remainingSegments =>
          Effect.succeed([
            Record.singleton(name, Array.join(remainingSegments, '/')),
            [],
          ]),
      }),
    print: (value, state) => {
      const path = value[name]

      if (isNormalizedPath(path)) {
        return Effect.succeed({
          ...state,
          segments: [...state.segments, path],
        })
      } else {
        return Effect.fail(
          new ParseError({
            message: `Expected a normalized path for ${name}`,
            expected: `non-empty path without leading, trailing, or repeated slashes (${name})`,
            actual: String.isEmpty(path) ? 'empty string' : path,
          }),
        )
      }
    },
  }
  return makeTerminalParser(parser)
}

/**
 * A parse-only parser with no print/build capabilities.
 *
 * Returned by `oneOf`, which combines multiple parsers whose print
 * types may differ and therefore cannot be unified into a single `Biparser`.
 */
export type Parser<A> = {
  parse: (
    segments: ReadonlyArray<string>,
    search?: string,
  ) => Effect.Effect<ParseResult<A>, ParseError>
}

type ParserInput = Biparser<any> | Parser<any>

type InferParsed<P> =
  P extends Biparser<infer A> ? A : P extends Parser<infer A> ? A : never

const complete = <A>([value, remaining]: ParseResult<A>) =>
  Array.match<string, Effect.Effect<ParseResult<A>, ParseError>>(remaining, {
    onEmpty: () => Effect.succeed([value, remaining]),
    onNonEmpty: () => {
      const remainingSegments = Array.join(remaining, '/')

      return Effect.fail(
        new ParseError({
          message: `Unexpected remaining segments: ${remainingSegments}`,
          actual: remainingSegments,
        }),
      )
    },
  })

/**
 * Combines multiple parsers, trying each in order until one matches the
 * entire path.
 *
 * A parser only matches when it consumes every segment, so a route never
 * shadows a longer route that shares its prefix. When several parsers
 * fully match the same URL, the first one wins.
 *
 * Returns a `Parser` (parse-only) since the union of different route
 * shapes cannot provide a single unified print function.
 */
export const oneOf = <Parsers extends ReadonlyArray<ParserInput>>(
  ...parsers: Parsers
): Parser<InferParsed<Parsers[number]>> => ({
  parse: (segments, search) =>
    Array.matchLeft(parsers, {
      onEmpty: () =>
        Effect.fail(
          new ParseError({
            message: `No parsers provided for path: /${Array.join(segments, '/')}`,
          }),
        ),
      onNonEmpty: () =>
        Effect.firstSuccessOf(
          Array.map(parsers, parser =>
            pipe(parser.parse(segments, search), Effect.flatMap(complete)),
          ),
        ),
    }),
})

/**
 * Converts a `Biparser` into a `Router` by mapping parsed values to a
 * tagged type constructor.
 *
 * The resulting `Router` can both parse URLs into tagged route values and
 * build URLs from route payloads.
 *
 * @example
 * ```ts
 * pipe(literal('users'), slash(int('id')), mapTo(UserRoute))
 * ```
 */
export const mapTo: {
  <T>(appRouteConstructor: {
    make: () => T
  }): (parser: Biparser<{}>) => Router<T>
  <A, T>(appRouteConstructor: {
    make: (data: A) => T
  }): (parser: Biparser<A>) => Router<T>
} = (appRouteConstructor: any): any => {
  return (parser: any) => {
    const build = buildUrl(parser)
    const router = Object.assign(build, {
      parse: (segments: ReadonlyArray<string>, search?: string) =>
        pipe(
          parser.parse(segments, search),
          Effect.map(([value, remaining]: any) => {
            const result =
              appRouteConstructor.make.length === 0
                ? appRouteConstructor.make()
                : appRouteConstructor.make(value)
            return [result, remaining]
          }),
        ),
      build,
    })
    return router
  }
}

/**
 * Composes two `Biparser`s sequentially, combining their parsed values.
 *
 * Cannot be used after a terminal parser (`query` or `rest`).
 * Composing with a terminal second parser yields a `TerminalParser`,
 * so terminality survives the composition.
 *
 * @example
 * ```ts
 * pipe(literal('users'), slash(int('id'))) // matches /users/42
 * ```
 */
export const slash: {
  <A extends Record<string, unknown>, B extends Record<string, unknown>>(
    parserB: TerminalParser<A>,
  ): (parserA: ExtendableBiparser<B>) => TerminalParser<B & A>
  <A extends Record<string, unknown>, B extends Record<string, unknown>>(
    parserB: Biparser<A>,
  ): (parserA: ExtendableBiparser<B>) => Biparser<B & A>
} =
  (parserB: Biparser<any>) =>
  (parserA: Biparser<any>): any => ({
    parse: (segments: ReadonlyArray<string>, search?: string) =>
      pipe(
        parserA.parse(segments, search),
        Effect.flatMap(([valueA, remainingA]) =>
          pipe(
            parserB.parse(remainingA, search),
            Effect.map(([valueB, remainingB]) => [
              { ...valueA, ...valueB },
              remainingB,
            ]),
          ),
        ),
      ),
    print: (value: any, state: PrintState) =>
      pipe(
        parserA.print(value, state),
        Effect.flatMap(newState => parserB.print(value, newState)),
      ),
  })

/**
 * Adds query parameter parsing to a `Biparser` using an Effect `Schema`.
 *
 * Produces a `TerminalParser` that cannot be extended with `slash`,
 * since query parameters must appear at the end of a route definition.
 *
 * @example
 * ```ts
 * pipe(
 *   literal('search'),
 *   query(Schema.Struct({ q: Schema.String })),
 *   mapTo(SearchRoute),
 * )
 * ```
 *
 * @param schema - An Effect Schema describing the expected query parameters.
 */
export const query =
  <A, I extends Record.ReadonlyRecord<string, unknown>>(
    schema: Schema.Codec<A, I>,
  ) =>
  <B extends Record<string, unknown>>(
    parser: Biparser<B>,
  ): TerminalParser<B & A> => {
    const queryParser: Biparser<B & A> = {
      parse: (segments, search) =>
        pipe(
          parser.parse(segments, search),
          Effect.flatMap(([pathValue, remainingSegments]) => {
            const searchParams = new URLSearchParams(search ?? '')
            const queryRecord = Record.fromEntries(searchParams.entries())

            return pipe(
              queryRecord,
              Schema.decodeUnknownEffect(schema),
              Effect.mapError(
                error =>
                  new ParseError({
                    message: `Query parameter validation failed: ${error.message}`,
                    expected: 'valid query parameters',
                    actual: search || 'empty',
                  }),
              ),
              Effect.map(
                queryValue =>
                  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                  [{ ...pathValue, ...queryValue }, remainingSegments] as [
                    B & A,
                    ReadonlyArray<string>,
                  ],
              ),
            )
          }),
        ),
      print: (value, state) =>
        pipe(
          parser.print(value, state),
          Effect.flatMap(newState =>
            pipe(
              Schema.encodeEffect(schema)(value),
              Effect.map(queryValue => {
                const newQueryParams = new URLSearchParams(newState.queryParams)
                pipe(
                  queryValue,
                  Record.toEntries,
                  Array.forEach(([key, val]) => {
                    if (Predicate.isNotNullish(val)) {
                      newQueryParams.set(key, val.toString())
                    }
                  }),
                )
                return {
                  ...newState,
                  queryParams: newQueryParams,
                }
              }),
              Effect.mapError(
                error =>
                  new ParseError({
                    message: `Query parameter encoding failed: ${error.message}`,
                  }),
              ),
            ),
          ),
        ),
    }
    return makeTerminalParser(queryParser)
  }

const parseUrl =
  <A>(parser: Biparser<A> | TerminalParser<A> | Parser<A>) =>
  (url: Url) =>
    pipe(
      pathToSegments(url.pathname),
      segments => parser.parse(segments, Option.getOrUndefined(url.search)),
      Effect.flatMap(complete),
      Effect.map(([value]) => value),
    )

/**
 * Parses a URL against a parser, falling back to a not-found route if no
 * parser matches.
 *
 * @param parser - The parser (typically from `oneOf`) to attempt.
 * @param notFoundRouteConstructor - Constructor called with `{ path }` when
 *   no route matches.
 */
export const parseUrlWithFallback =
  <A, B>(
    parser: Parser<A>,
    notFoundRouteConstructor: { make: (data: { path: string }) => B },
  ) =>
  (url: Url): A | B =>
    pipe(
      url,
      parseUrl(parser),
      Effect.catch(() =>
        Effect.succeed(notFoundRouteConstructor.make({ path: url.pathname })),
      ),
      Effect.runSync,
    )

const buildUrl =
  <A>(parser: Biparser<A>) =>
  (data: A): string => {
    const initialState: PrintState = {
      segments: [],
      queryParams: new URLSearchParams(),
    }

    return pipe(
      parser.print(data, initialState),
      Effect.map(state => {
        const path = '/' + Array.join(state.segments, '/')
        const query = state.queryParams.toString()
        return query ? `${path}?${query}` : path
      }),
      Effect.runSync,
    )
  }

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

import { Url } from '../url'

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
 * A `Biparser` that has been terminated (e.g. by `query`) and cannot
 * be extended with `slash`.
 */
export type TerminalParser<A> = Biparser<A> & { readonly __terminal: true }

const makeTerminalParser = <A>(parser: Biparser<A>): TerminalParser<A> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  parser as TerminalParser<A>

/**
 * Creates a parser that matches an exact URL path segment.
 *
 * @example
 * ```ts
 * literal('users') // matches /users
 * ```
 */
export const literal = (segment: string): Biparser<{}> => ({
  parse: segments =>
    Array.matchLeft(segments, {
      onEmpty: () =>
        Effect.fail(
          new ParseError({
            message: `Expected '${segment}'`,
            expected: segment,
            actual: 'end of path',
            position: 0,
          }),
        ),
      onNonEmpty: (head, tail) =>
        head === segment
          ? Effect.succeed([{}, tail])
          : Effect.fail(
              new ParseError({
                message: `Expected '${segment}'`,
                expected: segment,
                actual: head,
                position: 0,
              }),
            ),
    }),
  print: (_, state) =>
    Effect.succeed({
      ...state,
      segments: [...state.segments, segment],
    }),
})

/**
 * Creates a parser for a dynamic URL segment with custom parse and print functions.
 *
 * @param label - A descriptive name used in error messages.
 * @param parse - Converts a raw URL segment string into the parsed value.
 * @param print - Converts the parsed value back into a URL segment string.
 */
export const param = <A>(
  label: string,
  parse: (segment: string) => Effect.Effect<A, ParseError>,
  print: (value: A) => string,
): Biparser<A> => ({
  parse: segments =>
    Array.matchLeft(segments, {
      onEmpty: () =>
        Effect.fail(
          new ParseError({
            message: `Expected ${label}`,
            expected: label,
            actual: 'end of path',
            position: 0,
          }),
        ),
      onNonEmpty: (head, tail) =>
        pipe(
          head,
          parse,
          Effect.map(value => [value, tail]),
        ),
    }),
  print: (value, state) =>
    Effect.succeed({
      ...state,
      segments: [...state.segments, print(value)],
    }),
})

/**
 * Creates a parser that captures a URL segment as a named string field.
 *
 * @example
 * ```ts
 * string('slug') // parses /hello into { slug: "hello" }
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

/**
 * Combines multiple parsers, trying each in order until one succeeds.
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
          Array.map(parsers, parser => parser.parse(segments, search)),
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
 * Cannot be used after `query` since query parameters are terminal.
 *
 * @example
 * ```ts
 * pipe(literal('users'), slash(int('id'))) // matches /users/42
 * ```
 */
export const slash =
  <A extends Record<string, unknown>, B extends Record<string, unknown>>(
    parserB: Biparser<A>,
  ) =>
  (
    parserA: Biparser<B> & {
      readonly __terminal?: never
      readonly 'Cannot use slash after query - query parameters must be terminal'?: never
    },
  ): Biparser<B & A> => ({
    parse: (segments, search) =>
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
    print: (value, state) =>
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
 *   query(S.Struct({ q: S.String })),
 *   mapTo(SearchRoute),
 * )
 * ```
 *
 * @param schema - An Effect Schema describing the expected query parameters.
 */
export const query =
  <A, I extends Record.ReadonlyRecord<string, unknown>>(
    schema: Schema.Schema<A, I>,
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
              Schema.decodeUnknown(schema),
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
              Schema.encode(schema)(value),
              Effect.map(queryValue => {
                const newQueryParams = new URLSearchParams(newState.queryParams)
                pipe(
                  queryValue,
                  Record.toEntries,
                  Array.forEach(([key, val]) => {
                    if (Predicate.isNotNullable(val)) {
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

const pathToSegments = flow(String.split('/'), Array.filter(String.isNonEmpty))

const complete = <A>([value, remaining]: ParseResult<A>) =>
  Array.match<string, Effect.Effect<A, ParseError>>(remaining, {
    onEmpty: () => Effect.succeed(value),
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

const parseUrl =
  <A>(parser: Biparser<A> | TerminalParser<A> | Parser<A>) =>
  (url: Url) =>
    pipe(
      pathToSegments(url.pathname),
      segments => parser.parse(segments, Option.getOrUndefined(url.search)),
      Effect.flatMap(complete),
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
      Effect.orElse(() =>
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

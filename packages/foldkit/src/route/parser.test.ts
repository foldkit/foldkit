import { describe, it } from '@effect/vitest'
import { Effect, Option, Schema as S, pipe } from 'effect'
import { expect } from 'vitest'

import { Url } from '../url/index.js'
import { r } from './index.js'
import {
  int,
  literal,
  mapTo,
  oneOf,
  parseUrlWithFallback,
  query,
  root,
  slash,
  string,
} from './parser.js'

const makeUrl = (path: string, search?: string): Url => ({
  protocol: 'https:',
  host: 'example.com',
  port: Option.none(),
  pathname: path,
  search: search ? Option.some(search) : Option.none(),
  hash: Option.none(),
})

describe('literal', () => {
  it.effect('matches an exact segment', () =>
    Effect.gen(function* () {
      const [value, remaining] = yield* literal('users').parse(['users', 'abc'])
      expect(value).toStrictEqual({})
      expect(remaining).toStrictEqual(['abc'])
    }),
  )

  it.effect('fails on mismatched segment', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(literal('users').parse(['posts']))
      expect(error._tag).toBe('ParseError')
      expect(error.expected).toBe('users')
      expect(error.actual).toBe('posts')
    }),
  )

  it.effect('fails on empty segments', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(literal('users').parse([]))
      expect(error.actual).toBe('end of path')
    }),
  )

  it.effect('prints a segment', () =>
    Effect.gen(function* () {
      const state = yield* literal('users').print(
        {},
        { segments: [], queryParams: new URLSearchParams() },
      )
      expect(state.segments).toStrictEqual(['users'])
    }),
  )
})

describe('string', () => {
  it.effect('captures a segment as a named string', () =>
    Effect.gen(function* () {
      const [value, remaining] = yield* string('id').parse(['abc', 'next'])
      expect(value).toStrictEqual({ id: 'abc' })
      expect(remaining).toStrictEqual(['next'])
    }),
  )

  it.effect('fails on empty segments', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(string('id').parse([]))
      expect(error._tag).toBe('ParseError')
    }),
  )

  it.effect('prints the named value', () =>
    Effect.gen(function* () {
      const state = yield* string('id').print(
        { id: 'abc' },
        { segments: ['users'], queryParams: new URLSearchParams() },
      )
      expect(state.segments).toStrictEqual(['users', 'abc'])
    }),
  )
})

describe('int', () => {
  it.effect('parses a valid integer', () =>
    Effect.gen(function* () {
      const [value] = yield* int('id').parse(['42'])
      expect(value).toStrictEqual({ id: 42 })
    }),
  )

  it.effect('rejects non-integer strings', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(int('id').parse(['abc']))
      expect(error._tag).toBe('ParseError')
      expect(error.actual).toBe('abc')
    }),
  )

  it.effect('rejects floating point numbers', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(int('id').parse(['3.5']))
      expect(error._tag).toBe('ParseError')
    }),
  )

  it.effect('rejects empty string', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(int('id').parse(['']))
      expect(error._tag).toBe('ParseError')
    }),
  )

  it.effect('prints the integer as a string segment', () =>
    Effect.gen(function* () {
      const state = yield* int('id').print(
        { id: 42 },
        { segments: [], queryParams: new URLSearchParams() },
      )
      expect(state.segments).toStrictEqual(['42'])
    }),
  )
})

describe('root', () => {
  it.effect('succeeds on empty segments', () =>
    Effect.gen(function* () {
      const [value, remaining] = yield* root.parse([])
      expect(value).toStrictEqual({})
      expect(remaining).toStrictEqual([])
    }),
  )

  it.effect('fails when segments remain', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(root.parse(['extra']))
      expect(error._tag).toBe('ParseError')
    }),
  )
})

describe('slash', () => {
  it.effect('composes two parsers sequentially', () =>
    Effect.gen(function* () {
      const parser = pipe(literal('users'), slash(string('id')))
      const [value, remaining] = yield* parser.parse(['users', 'abc'])
      expect(value).toStrictEqual({ id: 'abc' })
      expect(remaining).toStrictEqual([])
    }),
  )

  it.effect('merges parsed values from chained parsers', () =>
    Effect.gen(function* () {
      const parser = pipe(
        literal('posts'),
        slash(string('postId')),
        slash(int('commentId')),
      )
      const [value] = yield* parser.parse(['posts', 'my-post', '5'])
      expect(value).toStrictEqual({ postId: 'my-post', commentId: 5 })
    }),
  )

  it.effect('fails if first parser fails', () =>
    Effect.gen(function* () {
      const parser = pipe(literal('users'), slash(string('id')))
      const error = yield* Effect.flip(parser.parse(['posts', 'abc']))
      expect(error._tag).toBe('ParseError')
    }),
  )

  it.effect('fails if second parser fails', () =>
    Effect.gen(function* () {
      const parser = pipe(literal('users'), slash(int('id')))
      const error = yield* Effect.flip(parser.parse(['users', 'abc']))
      expect(error._tag).toBe('ParseError')
    }),
  )
})

describe('query', () => {
  it.effect('parses query parameters with a schema', () =>
    Effect.gen(function* () {
      const parser = pipe(
        literal('items'),
        query(S.Struct({ page: S.FiniteFromString })),
      )
      const [value] = yield* parser.parse(['items'], 'page=3')
      expect(value).toStrictEqual({ page: 3 })
    }),
  )

  it.effect('fails on invalid query parameters', () =>
    Effect.gen(function* () {
      const parser = pipe(
        literal('items'),
        query(S.Struct({ page: S.FiniteFromString })),
      )
      const error = yield* Effect.flip(parser.parse(['items'], 'page=abc'))
      expect(error._tag).toBe('ParseError')
    }),
  )

  it.effect('combines path and query values', () =>
    Effect.gen(function* () {
      const parser = pipe(
        literal('shop'),
        slash(string('category')),
        query(S.Struct({ sort: S.String })),
      )
      const [value] = yield* parser.parse(['shop', 'electronics'], 'sort=price')
      expect(value).toStrictEqual({ category: 'electronics', sort: 'price' })
    }),
  )
})

describe('oneOf', () => {
  it.effect('matches the first successful parser', () =>
    Effect.gen(function* () {
      const parser = oneOf(literal('users'), literal('posts'))
      const [value] = yield* parser.parse(['users'])
      expect(value).toStrictEqual({})
    }),
  )

  it.effect('falls through to second parser', () =>
    Effect.gen(function* () {
      const parser = oneOf(literal('users'), literal('posts'))
      const [value] = yield* parser.parse(['posts'])
      expect(value).toStrictEqual({})
    }),
  )

  it.effect('fails when no parser matches', () =>
    Effect.gen(function* () {
      const parser = oneOf(literal('users'), literal('posts'))
      const error = yield* Effect.flip(parser.parse(['comments']))
      expect(error._tag).toBe('ParseError')
    }),
  )
})

describe('mapTo', () => {
  const Home = r('Home')
  const UserProfile = r('UserProfile', { id: S.String })

  it.effect('wraps parsed values with a constructor', () =>
    Effect.gen(function* () {
      const router = mapTo(Home)(root)
      const [result] = yield* router.parse([])
      expect(result).toStrictEqual({ _tag: 'Home' })
    }),
  )

  it.effect('wraps parameterized parsed values', () =>
    Effect.gen(function* () {
      const router = pipe(
        literal('users'),
        slash(string('id')),
        mapTo(UserProfile),
      )
      const [result] = yield* router.parse(['users', 'abc'])
      expect(result).toStrictEqual({ _tag: 'UserProfile', id: 'abc' })
    }),
  )

  it('builds a URL from route data', () => {
    const router = pipe(
      literal('users'),
      slash(string('id')),
      mapTo(UserProfile),
    )
    const url = router({ id: 'abc' })
    expect(url).toBe('/users/abc')
  })
})

describe('parseUrlWithFallback', () => {
  const Home = r('Home')
  const NotFound = r('NotFound', { path: S.String })

  const homeRouter = mapTo(Home)(root)
  const parser = oneOf(homeRouter)

  it('parses a matching URL', () => {
    const result = parseUrlWithFallback(parser, NotFound)(makeUrl('/'))
    expect(result).toStrictEqual({ _tag: 'Home' })
  })

  it('returns the fallback route for non-matching URLs', () => {
    const result = parseUrlWithFallback(parser, NotFound)(makeUrl('/unknown'))
    expect(result).toStrictEqual({ _tag: 'NotFound', path: '/unknown' })
  })
})

describe('round-trip: parse then build', () => {
  const Route = r('Route', { userId: S.String, postId: S.Number })

  const router = pipe(
    literal('users'),
    slash(string('userId')),
    slash(int('postId')),
    mapTo(Route),
  )

  it('build produces the expected path', () => {
    const url = router({ userId: 'jane', postId: 7 })
    expect(url).toBe('/users/jane/7')
  })

  it.effect('parse then build round-trips', () =>
    Effect.gen(function* () {
      const [parsed] = yield* router.parse(['users', 'jane', '7'])
      const rebuilt = router({
        userId: parsed.userId,
        postId: parsed.postId,
      })
      expect(rebuilt).toBe('/users/jane/7')
    }),
  )
})

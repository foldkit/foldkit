import { Schema } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { defineRouteUnion, defineTaggedUnion } from './index.js'

const Submission = defineTaggedUnion({
  NotSubmitted: {},
  Submitting: {},
  Failed: { error: Schema.String },
})
type Submission = typeof Submission.Type

const AppRoute = defineRouteUnion({
  Home: {},
  Person: { personId: Schema.Number },
  NotFound: { path: Schema.String },
})

describe('defineTaggedUnion', () => {
  it('builds a callable constructor for a variant with no fields', () => {
    expect(Submission.NotSubmitted()).toStrictEqual({ _tag: 'NotSubmitted' })
  })

  it('builds a callable constructor for a variant with fields', () => {
    expect(Submission.Failed({ error: 'timeout' })).toStrictEqual({
      _tag: 'Failed',
      error: 'timeout',
    })
  })

  it('decodes a member of the union', () => {
    expect(
      Schema.decodeUnknownSync(Submission)({
        _tag: 'Failed',
        error: 'timeout',
      }),
    ).toStrictEqual({ _tag: 'Failed', error: 'timeout' })
  })

  it('rejects a tag the union does not declare', () => {
    expect(() =>
      Schema.decodeUnknownSync(Submission)({ _tag: 'Unknown' }),
    ).toThrow()
  })

  it('works with exhaustive tag matching', () => {
    const describeSubmission = (submission: Submission) =>
      Submission.match<string>(submission, {
        NotSubmitted: () => 'not submitted',
        Submitting: () => 'submitting',
        Failed: ({ error }) => `failed: ${error}`,
      })

    expect(describeSubmission(Submission.Submitting())).toBe('submitting')
    expect(describeSubmission(Submission.Failed({ error: 'timeout' }))).toBe(
      'failed: timeout',
    )
  })

  it('narrows a value with isAnyOf', () => {
    const isSettled = Submission.isAnyOf(['NotSubmitted', 'Failed'])

    expect(isSettled(Submission.Failed({ error: 'timeout' }))).toBe(true)
    expect(isSettled(Submission.Submitting())).toBe(false)
  })

  it('exposes the member schemas that Machine.define enumerates', () => {
    expect(Submission.members).toStrictEqual([
      Submission.NotSubmitted,
      Submission.Submitting,
      Submission.Failed,
    ])
    expectTypeOf(Submission.members).toEqualTypeOf<
      ReadonlyArray<
        | typeof Submission.NotSubmitted
        | typeof Submission.Submitting
        | typeof Submission.Failed
      >
    >()
  })

  it('narrows a value with a per-variant guard', () => {
    expect(Submission.guards.Submitting(Submission.Submitting())).toBe(true)
    expect(Submission.guards.Submitting(Submission.NotSubmitted())).toBe(false)
  })
})

describe('subsets', () => {
  const Settled = Submission.subset(['NotSubmitted', 'Failed'])

  it('builds a Schema from only the named variants', () => {
    expect(
      Schema.decodeUnknownSync(Settled)({ _tag: 'Failed', error: 'timeout' }),
    ).toStrictEqual({ _tag: 'Failed', error: 'timeout' })
    expect(() =>
      Schema.decodeUnknownSync(Settled)({ _tag: 'Submitting' }),
    ).toThrow()

    expect(Settled.members).toStrictEqual([
      Submission.NotSubmitted,
      Submission.Failed,
    ])
    expectTypeOf(Settled.Type).toEqualTypeOf<
      typeof Submission.NotSubmitted.Type | typeof Submission.Failed.Type
    >()
  })

  it('rejects unknown and inherited variant names at runtime', () => {
    for (const tag of ['Unknown', 'toString']) {
      expect(() =>
        Reflect.apply(Submission.subset, undefined, [[tag]]),
      ).toThrow(`Union subset contains an unknown variant: ${tag}`)
    }
  })

  if (false) {
    // @ts-expect-error A subset can contain only variants from its union
    Submission.subset(['Unknown'])
  }
})

describe('defineRouteUnion', () => {
  it('builds route values that decode as members of the union', () => {
    const person = AppRoute.Person({ personId: 42 })

    expect(person).toStrictEqual({ _tag: 'Person', personId: 42 })
    expect(Schema.is(AppRoute)(person)).toBe(true)
  })

  it('exposes each variant as a schema in its own right', () => {
    expect(
      Schema.decodeUnknownSync(AppRoute.NotFound)({
        _tag: 'NotFound',
        path: '/missing',
      }),
    ).toStrictEqual({ _tag: 'NotFound', path: '/missing' })
  })

  it('builds a Route subset Schema', () => {
    const PublicRoute = AppRoute.subset(['Home', 'NotFound'])

    expect(Schema.is(PublicRoute)(AppRoute.Home())).toBe(true)
    expect(Schema.is(PublicRoute)(AppRoute.Person({ personId: 42 }))).toBe(
      false,
    )
    expectTypeOf(PublicRoute.Type).toEqualTypeOf<
      typeof AppRoute.Home.Type | typeof AppRoute.NotFound.Type
    >()
  })

  it('rejects a variant name that conflicts with a union property', () => {
    expect(() =>
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      defineRouteUnion({ members: {}, subset: {} } as never),
    ).toThrow('Route variant names conflict with union properties')
  })

  if (false) {
    // @ts-expect-error members is reserved by domain unions
    defineTaggedUnion({ members: {} })
    // @ts-expect-error members is reserved by Route unions
    defineRouteUnion({ members: {} })
    // @ts-expect-error subset is reserved by domain unions
    defineTaggedUnion({ subset: {} })
    // @ts-expect-error subset is reserved by Route unions
    defineRouteUnion({ subset: {} })
  }
})

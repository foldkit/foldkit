import { Option, Schema } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import { defineRouteUnion } from './index.js'
import {
  type Transition,
  coldLoad,
  entered,
  enteredAny,
  exited,
  exitedAny,
  isEntering,
  make,
  stayed,
} from './transition.js'

const AppRoute = defineRouteUnion({
  Home: {},
  Notes: {},
  NoteDetail: { id: Schema.String },
})

type AppRoute = typeof AppRoute.Type

describe('make', () => {
  it('builds a transition with the previous route present', () => {
    const transition: Transition<AppRoute> = make<AppRoute>(
      AppRoute.Home(),
      AppRoute.Notes(),
    )
    expect(transition.maybePreviousRoute).toStrictEqual(
      Option.some(AppRoute.Home()),
    )
    expect(transition.nextRoute).toStrictEqual(AppRoute.Notes())
  })
})

describe('coldLoad', () => {
  it('builds a transition with no previous route', () => {
    const transition: Transition<AppRoute> = coldLoad(AppRoute.Notes())
    expect(transition.maybePreviousRoute).toStrictEqual(Option.none())
    expect(transition.nextRoute).toStrictEqual(AppRoute.Notes())
  })
})

describe('enteredAny', () => {
  it('returns the next route when the tag changes', () => {
    expect(
      enteredAny(make<AppRoute>(AppRoute.Home(), AppRoute.Notes())),
    ).toStrictEqual(Option.some(AppRoute.Notes()))
  })

  it('returns the next route on a cold load', () => {
    expect(enteredAny(coldLoad(AppRoute.Notes()))).toStrictEqual(
      Option.some(AppRoute.Notes()),
    )
  })

  it('returns none when staying within one route across two ids', () => {
    const transition = make<AppRoute>(
      AppRoute.NoteDetail({ id: '1' }),
      AppRoute.NoteDetail({ id: '2' }),
    )
    expect(enteredAny(transition)).toStrictEqual(Option.none())
  })
})

describe('entered', () => {
  it('returns the narrowed route when entering the target route', () => {
    const transition = make<AppRoute>(
      AppRoute.Home(),
      AppRoute.NoteDetail({ id: '1' }),
    )
    const maybeEnteredNoteDetail = entered(transition, 'NoteDetail')
    expect(maybeEnteredNoteDetail).toStrictEqual(
      Option.some(AppRoute.NoteDetail({ id: '1' })),
    )
    expectTypeOf(maybeEnteredNoteDetail).toEqualTypeOf<
      Option.Option<typeof AppRoute.NoteDetail.Type>
    >()
  })

  it('returns the narrowed route on a cold load into the target route', () => {
    expect(
      entered(
        coldLoad<AppRoute>(AppRoute.NoteDetail({ id: '1' })),
        'NoteDetail',
      ),
    ).toStrictEqual(Option.some(AppRoute.NoteDetail({ id: '1' })))
  })

  it('returns none when entering a different route', () => {
    expect(
      entered(make<AppRoute>(AppRoute.Home(), AppRoute.Notes()), 'NoteDetail'),
    ).toStrictEqual(Option.none())
  })

  it('returns none when staying on the target route', () => {
    const transition = make<AppRoute>(
      AppRoute.NoteDetail({ id: '1' }),
      AppRoute.NoteDetail({ id: '2' }),
    )
    expect(entered(transition, 'NoteDetail')).toStrictEqual(Option.none())
  })
})

describe('exitedAny', () => {
  it('returns the previous route when the tag changes', () => {
    expect(
      exitedAny(make<AppRoute>(AppRoute.Home(), AppRoute.Notes())),
    ).toStrictEqual(Option.some(AppRoute.Home()))
  })

  it('returns none on a cold load', () => {
    expect(exitedAny(coldLoad<AppRoute>(AppRoute.Notes()))).toStrictEqual(
      Option.none(),
    )
  })

  it('returns none when staying within one route across two ids', () => {
    const transition = make<AppRoute>(
      AppRoute.NoteDetail({ id: '1' }),
      AppRoute.NoteDetail({ id: '2' }),
    )
    expect(exitedAny(transition)).toStrictEqual(Option.none())
  })
})

describe('exited', () => {
  it('returns none on a cold load into the target route', () => {
    expect(
      exited(
        coldLoad<AppRoute>(AppRoute.NoteDetail({ id: '1' })),
        'NoteDetail',
      ),
    ).toStrictEqual(Option.none())
  })

  it('returns the narrowed route when leaving the target route', () => {
    const transition = make<AppRoute>(
      AppRoute.NoteDetail({ id: '1' }),
      AppRoute.Home(),
    )
    const maybeExitedNoteDetail = exited(transition, 'NoteDetail')
    expect(maybeExitedNoteDetail).toStrictEqual(
      Option.some(AppRoute.NoteDetail({ id: '1' })),
    )
    expectTypeOf(maybeExitedNoteDetail).toEqualTypeOf<
      Option.Option<typeof AppRoute.NoteDetail.Type>
    >()
  })

  it('returns none when leaving a different route', () => {
    expect(
      exited(make<AppRoute>(AppRoute.Home(), AppRoute.Notes()), 'NoteDetail'),
    ).toStrictEqual(Option.none())
  })

  it('returns none when staying on the target route', () => {
    const transition = make<AppRoute>(
      AppRoute.NoteDetail({ id: '1' }),
      AppRoute.NoteDetail({ id: '2' }),
    )
    expect(exited(transition, 'NoteDetail')).toStrictEqual(Option.none())
  })
})

describe('stayed', () => {
  it('returns both narrowed sides when staying on the target route', () => {
    const transition = make<AppRoute>(
      AppRoute.NoteDetail({ id: '1' }),
      AppRoute.NoteDetail({ id: '2' }),
    )
    const maybeStayedNoteDetail = stayed(transition, 'NoteDetail')
    expect(maybeStayedNoteDetail).toStrictEqual(
      Option.some({
        previousRoute: AppRoute.NoteDetail({ id: '1' }),
        nextRoute: AppRoute.NoteDetail({ id: '2' }),
      }),
    )
    expectTypeOf(maybeStayedNoteDetail).toEqualTypeOf<
      Option.Option<
        Readonly<{
          previousRoute: typeof AppRoute.NoteDetail.Type
          nextRoute: typeof AppRoute.NoteDetail.Type
        }>
      >
    >()
  })

  it('returns none when entering the target route', () => {
    expect(
      stayed(
        make<AppRoute>(AppRoute.Home(), AppRoute.NoteDetail({ id: '1' })),
        'NoteDetail',
      ),
    ).toStrictEqual(Option.none())
  })

  it('returns none when leaving the target route', () => {
    expect(
      stayed(
        make<AppRoute>(AppRoute.NoteDetail({ id: '1' }), AppRoute.Home()),
        'NoteDetail',
      ),
    ).toStrictEqual(Option.none())
  })

  it('returns none on a cold load into the target route', () => {
    expect(
      stayed(
        coldLoad<AppRoute>(AppRoute.NoteDetail({ id: '1' })),
        'NoteDetail',
      ),
    ).toStrictEqual(Option.none())
  })

  it('returns none for a transition that never touched the target route', () => {
    expect(
      stayed(make<AppRoute>(AppRoute.Home(), AppRoute.Notes()), 'NoteDetail'),
    ).toStrictEqual(Option.none())
  })
})

describe('isEntering', () => {
  it('is true when entering the target route from a different route', () => {
    expect(
      isEntering(make<AppRoute>(AppRoute.Home(), AppRoute.Notes()), 'Notes'),
    ).toBe(true)
  })

  it('is true on a cold load into the target route', () => {
    expect(isEntering(coldLoad<AppRoute>(AppRoute.Notes()), 'Notes')).toBe(true)
  })

  it('is false when staying on the target route across two ids', () => {
    const transition = make<AppRoute>(
      AppRoute.NoteDetail({ id: '1' }),
      AppRoute.NoteDetail({ id: '2' }),
    )
    expect(isEntering(transition, 'NoteDetail')).toBe(false)
  })

  it('is false for a transition to a different route', () => {
    expect(
      isEntering(
        make<AppRoute>(AppRoute.Home(), AppRoute.NoteDetail({ id: '1' })),
        'Notes',
      ),
    ).toBe(false)
  })
})

describe('types', () => {
  it('checks the tag argument against the route union inferred from the transition', () => {
    const transition = coldLoad<AppRoute>(AppRoute.Notes())
    // @ts-expect-error 'Missing' is not a tag of AppRoute
    isEntering(transition, 'Missing')
    // @ts-expect-error 'Missing' is not a tag of AppRoute
    entered(transition, 'Missing')
    // @ts-expect-error 'Missing' is not a tag of AppRoute
    exited(transition, 'Missing')
    expect(isEntering(transition, 'Notes')).toBe(true)
  })
})

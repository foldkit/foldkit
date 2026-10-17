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

const ApplicationRoute = defineRouteUnion({
  Home: {},
  Notes: {},
  NoteDetail: { id: Schema.String },
})

type ApplicationRoute = typeof ApplicationRoute.Type

describe('make', () => {
  it('builds a transition with the previous route present', () => {
    const transition: Transition<ApplicationRoute> = make<ApplicationRoute>(
      ApplicationRoute.Home(),
      ApplicationRoute.Notes(),
    )
    expect(transition.maybePreviousRoute).toStrictEqual(
      Option.some(ApplicationRoute.Home()),
    )
    expect(transition.nextRoute).toStrictEqual(ApplicationRoute.Notes())
  })
})

describe('coldLoad', () => {
  it('builds a transition with no previous route', () => {
    const transition: Transition<ApplicationRoute> = coldLoad(
      ApplicationRoute.Notes(),
    )
    expect(transition.maybePreviousRoute).toStrictEqual(Option.none())
    expect(transition.nextRoute).toStrictEqual(ApplicationRoute.Notes())
  })
})

describe('enteredAny', () => {
  it('returns the next route when the tag changes', () => {
    expect(
      enteredAny(
        make<ApplicationRoute>(
          ApplicationRoute.Home(),
          ApplicationRoute.Notes(),
        ),
      ),
    ).toStrictEqual(Option.some(ApplicationRoute.Notes()))
  })

  it('returns the next route on a cold load', () => {
    expect(enteredAny(coldLoad(ApplicationRoute.Notes()))).toStrictEqual(
      Option.some(ApplicationRoute.Notes()),
    )
  })

  it('returns none when staying within one route across two ids', () => {
    const transition = make<ApplicationRoute>(
      ApplicationRoute.NoteDetail({ id: '1' }),
      ApplicationRoute.NoteDetail({ id: '2' }),
    )
    expect(enteredAny(transition)).toStrictEqual(Option.none())
  })
})

describe('entered', () => {
  it('returns the narrowed route when entering the target route', () => {
    const transition = make<ApplicationRoute>(
      ApplicationRoute.Home(),
      ApplicationRoute.NoteDetail({ id: '1' }),
    )
    const maybeEnteredNoteDetail = entered(transition, 'NoteDetail')
    expect(maybeEnteredNoteDetail).toStrictEqual(
      Option.some(ApplicationRoute.NoteDetail({ id: '1' })),
    )
    expectTypeOf(maybeEnteredNoteDetail).toEqualTypeOf<
      Option.Option<typeof ApplicationRoute.NoteDetail.Type>
    >()
  })

  it('returns the narrowed route on a cold load into the target route', () => {
    expect(
      entered(
        coldLoad<ApplicationRoute>(ApplicationRoute.NoteDetail({ id: '1' })),
        'NoteDetail',
      ),
    ).toStrictEqual(Option.some(ApplicationRoute.NoteDetail({ id: '1' })))
  })

  it('returns none when entering a different route', () => {
    expect(
      entered(
        make<ApplicationRoute>(
          ApplicationRoute.Home(),
          ApplicationRoute.Notes(),
        ),
        'NoteDetail',
      ),
    ).toStrictEqual(Option.none())
  })

  it('returns none when staying on the target route', () => {
    const transition = make<ApplicationRoute>(
      ApplicationRoute.NoteDetail({ id: '1' }),
      ApplicationRoute.NoteDetail({ id: '2' }),
    )
    expect(entered(transition, 'NoteDetail')).toStrictEqual(Option.none())
  })
})

describe('exitedAny', () => {
  it('returns the previous route when the tag changes', () => {
    expect(
      exitedAny(
        make<ApplicationRoute>(
          ApplicationRoute.Home(),
          ApplicationRoute.Notes(),
        ),
      ),
    ).toStrictEqual(Option.some(ApplicationRoute.Home()))
  })

  it('returns none on a cold load', () => {
    expect(
      exitedAny(coldLoad<ApplicationRoute>(ApplicationRoute.Notes())),
    ).toStrictEqual(Option.none())
  })

  it('returns none when staying within one route across two ids', () => {
    const transition = make<ApplicationRoute>(
      ApplicationRoute.NoteDetail({ id: '1' }),
      ApplicationRoute.NoteDetail({ id: '2' }),
    )
    expect(exitedAny(transition)).toStrictEqual(Option.none())
  })
})

describe('exited', () => {
  it('returns none on a cold load into the target route', () => {
    expect(
      exited(
        coldLoad<ApplicationRoute>(ApplicationRoute.NoteDetail({ id: '1' })),
        'NoteDetail',
      ),
    ).toStrictEqual(Option.none())
  })

  it('returns the narrowed route when leaving the target route', () => {
    const transition = make<ApplicationRoute>(
      ApplicationRoute.NoteDetail({ id: '1' }),
      ApplicationRoute.Home(),
    )
    const maybeExitedNoteDetail = exited(transition, 'NoteDetail')
    expect(maybeExitedNoteDetail).toStrictEqual(
      Option.some(ApplicationRoute.NoteDetail({ id: '1' })),
    )
    expectTypeOf(maybeExitedNoteDetail).toEqualTypeOf<
      Option.Option<typeof ApplicationRoute.NoteDetail.Type>
    >()
  })

  it('returns none when leaving a different route', () => {
    expect(
      exited(
        make<ApplicationRoute>(
          ApplicationRoute.Home(),
          ApplicationRoute.Notes(),
        ),
        'NoteDetail',
      ),
    ).toStrictEqual(Option.none())
  })

  it('returns none when staying on the target route', () => {
    const transition = make<ApplicationRoute>(
      ApplicationRoute.NoteDetail({ id: '1' }),
      ApplicationRoute.NoteDetail({ id: '2' }),
    )
    expect(exited(transition, 'NoteDetail')).toStrictEqual(Option.none())
  })
})

describe('stayed', () => {
  it('returns both narrowed sides when staying on the target route', () => {
    const transition = make<ApplicationRoute>(
      ApplicationRoute.NoteDetail({ id: '1' }),
      ApplicationRoute.NoteDetail({ id: '2' }),
    )
    const maybeStayedNoteDetail = stayed(transition, 'NoteDetail')
    expect(maybeStayedNoteDetail).toStrictEqual(
      Option.some({
        previousRoute: ApplicationRoute.NoteDetail({ id: '1' }),
        nextRoute: ApplicationRoute.NoteDetail({ id: '2' }),
      }),
    )
    expectTypeOf(maybeStayedNoteDetail).toEqualTypeOf<
      Option.Option<
        Readonly<{
          previousRoute: typeof ApplicationRoute.NoteDetail.Type
          nextRoute: typeof ApplicationRoute.NoteDetail.Type
        }>
      >
    >()
  })

  it('returns none when entering the target route', () => {
    expect(
      stayed(
        make<ApplicationRoute>(
          ApplicationRoute.Home(),
          ApplicationRoute.NoteDetail({ id: '1' }),
        ),
        'NoteDetail',
      ),
    ).toStrictEqual(Option.none())
  })

  it('returns none when leaving the target route', () => {
    expect(
      stayed(
        make<ApplicationRoute>(
          ApplicationRoute.NoteDetail({ id: '1' }),
          ApplicationRoute.Home(),
        ),
        'NoteDetail',
      ),
    ).toStrictEqual(Option.none())
  })

  it('returns none on a cold load into the target route', () => {
    expect(
      stayed(
        coldLoad<ApplicationRoute>(ApplicationRoute.NoteDetail({ id: '1' })),
        'NoteDetail',
      ),
    ).toStrictEqual(Option.none())
  })

  it('returns none for a transition that never touched the target route', () => {
    expect(
      stayed(
        make<ApplicationRoute>(
          ApplicationRoute.Home(),
          ApplicationRoute.Notes(),
        ),
        'NoteDetail',
      ),
    ).toStrictEqual(Option.none())
  })
})

describe('isEntering', () => {
  it('is true when entering the target route from a different route', () => {
    expect(
      isEntering(
        make<ApplicationRoute>(
          ApplicationRoute.Home(),
          ApplicationRoute.Notes(),
        ),
        'Notes',
      ),
    ).toBe(true)
  })

  it('is true on a cold load into the target route', () => {
    expect(
      isEntering(coldLoad<ApplicationRoute>(ApplicationRoute.Notes()), 'Notes'),
    ).toBe(true)
  })

  it('is false when staying on the target route across two ids', () => {
    const transition = make<ApplicationRoute>(
      ApplicationRoute.NoteDetail({ id: '1' }),
      ApplicationRoute.NoteDetail({ id: '2' }),
    )
    expect(isEntering(transition, 'NoteDetail')).toBe(false)
  })

  it('is false for a transition to a different route', () => {
    expect(
      isEntering(
        make<ApplicationRoute>(
          ApplicationRoute.Home(),
          ApplicationRoute.NoteDetail({ id: '1' }),
        ),
        'Notes',
      ),
    ).toBe(false)
  })
})

describe('types', () => {
  it('checks the tag argument against the route union inferred from the transition', () => {
    const transition = coldLoad<ApplicationRoute>(ApplicationRoute.Notes())
    // @ts-expect-error 'Missing' is not a tag of ApplicationRoute
    isEntering(transition, 'Missing')
    // @ts-expect-error 'Missing' is not a tag of ApplicationRoute
    entered(transition, 'Missing')
    // @ts-expect-error 'Missing' is not a tag of ApplicationRoute
    exited(transition, 'Missing')
    expect(isEntering(transition, 'Notes')).toBe(true)
  })
})

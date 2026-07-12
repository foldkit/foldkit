import { Option, Schema as S } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import { r } from './index.js'
import {
  type Transition,
  coldLoad,
  entered,
  enteredRoute,
  exited,
  exitedRoute,
  isEntering,
  make,
  stayed,
} from './transition.js'

const Home = r('Home')
const Notes = r('Notes')
const NoteDetail = r('NoteDetail', { id: S.String })

type AppRoute = typeof Home.Type | typeof Notes.Type | typeof NoteDetail.Type

describe('make', () => {
  it('builds a transition with the previous route present', () => {
    const transition: Transition<AppRoute> = make<AppRoute>(Home(), Notes())
    expect(transition.maybePreviousRoute).toStrictEqual(Option.some(Home()))
    expect(transition.nextRoute).toStrictEqual(Notes())
  })
})

describe('coldLoad', () => {
  it('builds a transition with no previous route', () => {
    const transition: Transition<AppRoute> = coldLoad(Notes())
    expect(transition.maybePreviousRoute).toStrictEqual(Option.none())
    expect(transition.nextRoute).toStrictEqual(Notes())
  })
})

describe('entered', () => {
  it('returns the next route when the tag changes', () => {
    expect(entered(make<AppRoute>(Home(), Notes()))).toStrictEqual(
      Option.some(Notes()),
    )
  })

  it('returns the next route on a cold load', () => {
    expect(entered(coldLoad(Notes()))).toStrictEqual(Option.some(Notes()))
  })

  it('returns none when staying within one route across two ids', () => {
    const transition = make<AppRoute>(
      NoteDetail({ id: '1' }),
      NoteDetail({ id: '2' }),
    )
    expect(entered(transition)).toStrictEqual(Option.none())
  })
})

describe('enteredRoute', () => {
  it('returns the narrowed route when entering the target route', () => {
    const transition = make<AppRoute>(Home(), NoteDetail({ id: '1' }))
    const maybeEnteredNoteDetail = enteredRoute(transition, 'NoteDetail')
    expect(maybeEnteredNoteDetail).toStrictEqual(
      Option.some(NoteDetail({ id: '1' })),
    )
    expectTypeOf(maybeEnteredNoteDetail).toEqualTypeOf<
      Option.Option<typeof NoteDetail.Type>
    >()
  })

  it('returns the narrowed route on a cold load into the target route', () => {
    expect(
      enteredRoute(coldLoad<AppRoute>(NoteDetail({ id: '1' })), 'NoteDetail'),
    ).toStrictEqual(Option.some(NoteDetail({ id: '1' })))
  })

  it('returns none when entering a different route', () => {
    expect(
      enteredRoute(make<AppRoute>(Home(), Notes()), 'NoteDetail'),
    ).toStrictEqual(Option.none())
  })

  it('returns none when staying on the target route', () => {
    const transition = make<AppRoute>(
      NoteDetail({ id: '1' }),
      NoteDetail({ id: '2' }),
    )
    expect(enteredRoute(transition, 'NoteDetail')).toStrictEqual(Option.none())
  })
})

describe('exited', () => {
  it('returns the previous route when the tag changes', () => {
    expect(exited(make<AppRoute>(Home(), Notes()))).toStrictEqual(
      Option.some(Home()),
    )
  })

  it('returns none on a cold load', () => {
    expect(exited(coldLoad<AppRoute>(Notes()))).toStrictEqual(Option.none())
  })

  it('returns none when staying within one route across two ids', () => {
    const transition = make<AppRoute>(
      NoteDetail({ id: '1' }),
      NoteDetail({ id: '2' }),
    )
    expect(exited(transition)).toStrictEqual(Option.none())
  })
})

describe('exitedRoute', () => {
  it('returns none on a cold load into the target route', () => {
    expect(
      exitedRoute(coldLoad<AppRoute>(NoteDetail({ id: '1' })), 'NoteDetail'),
    ).toStrictEqual(Option.none())
  })

  it('returns the narrowed route when leaving the target route', () => {
    const transition = make<AppRoute>(NoteDetail({ id: '1' }), Home())
    const maybeExitedNoteDetail = exitedRoute(transition, 'NoteDetail')
    expect(maybeExitedNoteDetail).toStrictEqual(
      Option.some(NoteDetail({ id: '1' })),
    )
    expectTypeOf(maybeExitedNoteDetail).toEqualTypeOf<
      Option.Option<typeof NoteDetail.Type>
    >()
  })

  it('returns none when leaving a different route', () => {
    expect(
      exitedRoute(make<AppRoute>(Home(), Notes()), 'NoteDetail'),
    ).toStrictEqual(Option.none())
  })

  it('returns none when staying on the target route', () => {
    const transition = make<AppRoute>(
      NoteDetail({ id: '1' }),
      NoteDetail({ id: '2' }),
    )
    expect(exitedRoute(transition, 'NoteDetail')).toStrictEqual(Option.none())
  })
})

describe('stayed', () => {
  it('returns both narrowed sides when staying on the target route', () => {
    const transition = make<AppRoute>(
      NoteDetail({ id: '1' }),
      NoteDetail({ id: '2' }),
    )
    const maybeStayedNoteDetail = stayed(transition, 'NoteDetail')
    expect(maybeStayedNoteDetail).toStrictEqual(
      Option.some({
        previousRoute: NoteDetail({ id: '1' }),
        nextRoute: NoteDetail({ id: '2' }),
      }),
    )
    expectTypeOf(maybeStayedNoteDetail).toEqualTypeOf<
      Option.Option<
        Readonly<{
          previousRoute: typeof NoteDetail.Type
          nextRoute: typeof NoteDetail.Type
        }>
      >
    >()
  })

  it('returns none when entering the target route', () => {
    expect(
      stayed(make<AppRoute>(Home(), NoteDetail({ id: '1' })), 'NoteDetail'),
    ).toStrictEqual(Option.none())
  })

  it('returns none when leaving the target route', () => {
    expect(
      stayed(make<AppRoute>(NoteDetail({ id: '1' }), Home()), 'NoteDetail'),
    ).toStrictEqual(Option.none())
  })

  it('returns none on a cold load into the target route', () => {
    expect(
      stayed(coldLoad<AppRoute>(NoteDetail({ id: '1' })), 'NoteDetail'),
    ).toStrictEqual(Option.none())
  })

  it('returns none for a transition that never touched the target route', () => {
    expect(stayed(make<AppRoute>(Home(), Notes()), 'NoteDetail')).toStrictEqual(
      Option.none(),
    )
  })
})

describe('isEntering', () => {
  it('is true when entering the target route from a different route', () => {
    expect(isEntering(make<AppRoute>(Home(), Notes()), 'Notes')).toBe(true)
  })

  it('is true on a cold load into the target route', () => {
    expect(isEntering(coldLoad<AppRoute>(Notes()), 'Notes')).toBe(true)
  })

  it('is false when staying on the target route across two ids', () => {
    const transition = make<AppRoute>(
      NoteDetail({ id: '1' }),
      NoteDetail({ id: '2' }),
    )
    expect(isEntering(transition, 'NoteDetail')).toBe(false)
  })

  it('is false for a transition to a different route', () => {
    expect(
      isEntering(make<AppRoute>(Home(), NoteDetail({ id: '1' })), 'Notes'),
    ).toBe(false)
  })
})

describe('types', () => {
  it('checks the tag argument against the route union inferred from the transition', () => {
    const transition = coldLoad<AppRoute>(Notes())
    // @ts-expect-error 'Missing' is not a tag of AppRoute
    isEntering(transition, 'Missing')
    // @ts-expect-error 'Missing' is not a tag of AppRoute
    enteredRoute(transition, 'Missing')
    expect(isEntering(transition, 'Notes')).toBe(true)
  })
})

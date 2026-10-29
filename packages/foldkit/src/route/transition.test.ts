import { Equal, Option, Schema } from 'effect'
import { expect, expectTypeOf, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import type { Command } from '../command/index.js'
import type { Step } from '../update/index.js'
import { defineRouteUnion } from './index.js'
import {
  type Transition,
  coldLoad,
  entered,
  enteredAny,
  exited,
  exitedAny,
  isEntering,
  isExiting,
  isStaying,
  make,
  match,
  matchOrElse,
  stayed,
} from './transition.js'

const ApplicationRoute = defineRouteUnion({
  Home: {},
  Notes: {},
  NoteDetail: { id: Schema.String },
  People: { searchText: Schema.Option(Schema.String) },
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

const note = ApplicationRoute.NoteDetail({ id: '1' })
const nextNote = ApplicationRoute.NoteDetail({ id: '2' })
const transitionCases = [
  {
    name: 'cold load into the selected tag',
    transition: coldLoad<ApplicationRoute>(note),
    expected: 'Entered',
  },
  {
    name: 'cold load outside the selected tag',
    transition: coldLoad<ApplicationRoute>(ApplicationRoute.Home()),
    expected: 'Unrelated',
  },
  {
    name: 'entry into the selected tag',
    transition: make<ApplicationRoute>(ApplicationRoute.Home(), note),
    expected: 'Entered',
  },
  {
    name: 'exit from the selected tag',
    transition: make<ApplicationRoute>(note, ApplicationRoute.Home()),
    expected: 'Exited',
  },
  {
    name: 'same tag with changed payload',
    transition: make<ApplicationRoute>(note, nextNote),
    expected: 'Stayed',
  },
  {
    name: 'same tag with equal payload',
    transition: make<ApplicationRoute>(note, note),
    expected: 'Stayed',
  },
  {
    name: 'navigation between unrelated tags',
    transition: make<ApplicationRoute>(
      ApplicationRoute.Home(),
      ApplicationRoute.Notes(),
    ),
    expected: 'Unrelated',
  },
  {
    name: 'navigation within an unrelated tag',
    transition: make<ApplicationRoute>(
      ApplicationRoute.Home(),
      ApplicationRoute.Home(),
    ),
    expected: 'Unrelated',
  },
]

describe('transition classification', () => {
  it.each(transitionCases)(
    'classifies $name as $expected',
    ({ transition, expected }) => {
      const handlers = {
        Entered: vi.fn(
          (nextRoute: typeof ApplicationRoute.NoteDetail.Type) => nextRoute.id,
        ),
        Exited: vi.fn(
          (previousRoute: typeof ApplicationRoute.NoteDetail.Type) =>
            previousRoute.id,
        ),
        Stayed: vi.fn(
          (
            routes: Readonly<{
              previousRoute: typeof ApplicationRoute.NoteDetail.Type
              nextRoute: typeof ApplicationRoute.NoteDetail.Type
            }>,
          ) => `${routes.previousRoute.id}:${routes.nextRoute.id}`,
        ),
        Unrelated: vi.fn(() => 'unrelated'),
      }

      match(transition, 'NoteDetail', handlers)

      for (const [caseName, handler] of Object.entries(handlers)) {
        expect(handler).toHaveBeenCalledTimes(caseName === expected ? 1 : 0)
      }

      expect(isExiting(transition, 'NoteDetail')).toBe(expected === 'Exited')
      expect(isStaying(transition, 'NoteDetail')).toBe(expected === 'Stayed')

      if (expected === 'Entered') {
        expect(handlers.Entered).toHaveBeenCalledWith(transition.nextRoute)
      }

      if (Option.isSome(transition.maybePreviousRoute)) {
        if (expected === 'Exited') {
          expect(handlers.Exited).toHaveBeenCalledWith(
            transition.maybePreviousRoute.value,
          )
        }

        if (expected === 'Stayed') {
          expect(handlers.Stayed).toHaveBeenCalledWith({
            previousRoute: transition.maybePreviousRoute.value,
            nextRoute: transition.nextRoute,
          })
        }
      }
    },
  )

  it('passes changed searchText values to Stayed', () => {
    const classifySearch = (transition: Transition<ApplicationRoute>) =>
      match(transition, 'People', {
        Entered: () => 'fetch',
        Exited: () => 'unchanged',
        Stayed: ({ previousRoute, nextRoute }) => {
          expectTypeOf(previousRoute).toEqualTypeOf<
            typeof ApplicationRoute.People.Type
          >()
          expectTypeOf(nextRoute).toEqualTypeOf<
            typeof ApplicationRoute.People.Type
          >()

          return Equal.equals(previousRoute.searchText, nextRoute.searchText)
            ? 'unchanged'
            : 'fetch'
        },
        Unrelated: () => 'unchanged',
      })

    const people = ApplicationRoute.People({ searchText: Option.some('alice') })
    const nextPeople = ApplicationRoute.People({
      searchText: Option.some('bob'),
    })

    expect(classifySearch(make<ApplicationRoute>(people, nextPeople))).toBe(
      'fetch',
    )
    expect(classifySearch(make<ApplicationRoute>(people, people))).toBe(
      'unchanged',
    )
  })

  it.each(transitionCases)(
    'falls back only for omitted cases ($expected)',
    ({ transition, expected }) => {
      const onEntered = vi.fn(() => undefined)
      const fallback = vi.fn(() => 'fallback')

      const result = matchOrElse(
        transition,
        'NoteDetail',
        { Entered: onEntered },
        fallback,
      )

      expect(onEntered).toHaveBeenCalledTimes(expected === 'Entered' ? 1 : 0)
      expect(fallback).toHaveBeenCalledTimes(expected === 'Entered' ? 0 : 1)
      expect(result).toBe(expected === 'Entered' ? undefined : 'fallback')
    },
  )

  it.each(transitionCases)(
    'uses each supplied handler ($expected)',
    ({ transition, expected }) => {
      const fallback = vi.fn(() => 'fallback')
      const result = matchOrElse(
        transition,
        'NoteDetail',
        {
          Entered: nextRoute => `Entered:${nextRoute.id}`,
          Exited: previousRoute => `Exited:${previousRoute.id}`,
          Stayed: ({ previousRoute, nextRoute }) =>
            `Stayed:${previousRoute.id}:${nextRoute.id}`,
          Unrelated: () => 'Unrelated',
        },
        fallback,
      )

      expect(result.startsWith(expected)).toBe(true)
      expect(fallback).not.toHaveBeenCalled()
      expect(matchOrElse(transition, 'NoteDetail', {}, () => 'empty')).toBe(
        'empty',
      )
    },
  )
})

describe('matcher types', () => {
  it('narrows route payloads and infers a union of branch returns', () => {
    const transition = make<ApplicationRoute>(note, nextNote)
    const handlers = {
      Entered: () => 1,
      Exited: () => 'exited',
      Stayed: () => true,
      Unrelated: () => undefined,
    }
    const result = match(transition, 'NoteDetail', {
      Entered: nextRoute => {
        expectTypeOf(nextRoute).toEqualTypeOf<
          typeof ApplicationRoute.NoteDetail.Type
        >()
        return 1
      },
      Exited: previousRoute => {
        expectTypeOf(previousRoute).toEqualTypeOf<
          typeof ApplicationRoute.NoteDetail.Type
        >()
        return 'exited'
      },
      Stayed: ({ previousRoute, nextRoute }) => {
        expectTypeOf(previousRoute).toEqualTypeOf<
          typeof ApplicationRoute.NoteDetail.Type
        >()
        expectTypeOf(nextRoute).toEqualTypeOf<
          typeof ApplicationRoute.NoteDetail.Type
        >()
        return true
      },
      Unrelated: () => undefined,
    })
    expectTypeOf(result).toEqualTypeOf<number | string | boolean | undefined>()

    const partial = matchOrElse(
      transition,
      'NoteDetail',
      {
        Entered: nextRoute => {
          expectTypeOf(nextRoute).toEqualTypeOf<
            typeof ApplicationRoute.NoteDetail.Type
          >()
          return 1
        },
        Exited: previousRoute => {
          expectTypeOf(previousRoute).toEqualTypeOf<
            typeof ApplicationRoute.NoteDetail.Type
          >()
          return 'exited'
        },
        Stayed: ({ previousRoute, nextRoute }) => {
          expectTypeOf(previousRoute).toEqualTypeOf<
            typeof ApplicationRoute.NoteDetail.Type
          >()
          expectTypeOf(nextRoute).toEqualTypeOf<
            typeof ApplicationRoute.NoteDetail.Type
          >()
          return true
        },
      },
      () => undefined,
    )
    expectTypeOf(partial).toEqualTypeOf<number | string | boolean | undefined>()

    // NOTE: In the TypeScript 7.1 all-source program, dropping both type
    // dependencies makes unrelated Service constraints resolve incorrectly.
    // Matcher-produced Steps are checked in the route-step-program fixtures.
    type MatcherStep = Step<ApplicationRoute, ApplicationRoute>
    expectTypeOf<
      NonNullable<ReturnType<MatcherStep>['commands']>[number]
    >().toEqualTypeOf<Command<ApplicationRoute>>()

    if (false) {
      // @ts-expect-error Invalid route tag
      match(transition, 'Missing', handlers)
      // @ts-expect-error Invalid route tag
      matchOrElse(transition, 'Missing', {}, () => undefined)
      // @ts-expect-error Exhaustive matching requires Unrelated
      match(transition, 'NoteDetail', {
        Entered: () => 1,
        Exited: () => 2,
        Stayed: () => 3,
      })
      // @ts-expect-error Fallback is required
      matchOrElse(transition, 'NoteDetail', {})
      matchOrElse(
        transition,
        'NoteDetail',
        // @ts-expect-error Invalid handler payload
        { Entered: (route: typeof ApplicationRoute.Home.Type) => route },
        () => undefined,
      )
      // @ts-expect-error Invalid route tag
      isExiting(transition, 'Missing')
      // @ts-expect-error Invalid route tag
      isStaying(transition, 'Missing')
    }
  })
})

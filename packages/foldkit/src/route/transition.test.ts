import { Context, Effect, Equal, Option, Schema } from 'effect'
import { expect, expectTypeOf, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import type * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Update from '../update/index.js'
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

const AppRoute = defineRouteUnion({
  Home: {},
  Notes: {},
  NoteDetail: { id: Schema.String },
  People: { searchText: Schema.Option(Schema.String) },
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

const note = AppRoute.NoteDetail({ id: '1' })
const nextNote = AppRoute.NoteDetail({ id: '2' })
const transitionCases = [
  {
    name: 'cold load into the selected tag',
    transition: coldLoad<AppRoute>(note),
    expected: 'Entered',
  },
  {
    name: 'cold load outside the selected tag',
    transition: coldLoad<AppRoute>(AppRoute.Home()),
    expected: 'Unrelated',
  },
  {
    name: 'entry into the selected tag',
    transition: make<AppRoute>(AppRoute.Home(), note),
    expected: 'Entered',
  },
  {
    name: 'exit from the selected tag',
    transition: make<AppRoute>(note, AppRoute.Home()),
    expected: 'Exited',
  },
  {
    name: 'same tag with changed payload',
    transition: make<AppRoute>(note, nextNote),
    expected: 'Stayed',
  },
  {
    name: 'same tag with equal payload',
    transition: make<AppRoute>(note, note),
    expected: 'Stayed',
  },
  {
    name: 'navigation between unrelated tags',
    transition: make<AppRoute>(AppRoute.Home(), AppRoute.Notes()),
    expected: 'Unrelated',
  },
  {
    name: 'navigation within an unrelated tag',
    transition: make<AppRoute>(AppRoute.Home(), AppRoute.Home()),
    expected: 'Unrelated',
  },
]

describe('transition classification', () => {
  it.each(transitionCases)(
    'classifies $name as $expected',
    ({ transition, expected }) => {
      const handlers = {
        Entered: vi.fn(
          (nextRoute: typeof AppRoute.NoteDetail.Type) => nextRoute.id,
        ),
        Exited: vi.fn(
          (previousRoute: typeof AppRoute.NoteDetail.Type) => previousRoute.id,
        ),
        Stayed: vi.fn(
          (
            routes: Readonly<{
              previousRoute: typeof AppRoute.NoteDetail.Type
              nextRoute: typeof AppRoute.NoteDetail.Type
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
    const classifySearch = (transition: Transition<AppRoute>) =>
      match(transition, 'People', {
        Entered: () => 'fetch',
        Exited: () => 'unchanged',
        Stayed: ({ previousRoute, nextRoute }) => {
          expectTypeOf(previousRoute).toEqualTypeOf<
            typeof AppRoute.People.Type
          >()
          expectTypeOf(nextRoute).toEqualTypeOf<typeof AppRoute.People.Type>()

          return Equal.equals(previousRoute.searchText, nextRoute.searchText)
            ? 'unchanged'
            : 'fetch'
        },
        Unrelated: () => 'unchanged',
      })

    const people = AppRoute.People({ searchText: Option.some('alice') })
    const nextPeople = AppRoute.People({ searchText: Option.some('bob') })

    expect(classifySearch(make<AppRoute>(people, nextPeople))).toBe('fetch')
    expect(classifySearch(make<AppRoute>(people, people))).toBe('unchanged')
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
    const transition = make<AppRoute>(note, nextNote)
    const handlers = {
      Entered: () => 1,
      Exited: () => 'exited',
      Stayed: () => true,
      Unrelated: () => undefined,
    }
    const result = match(transition, 'NoteDetail', {
      Entered: nextRoute => {
        expectTypeOf(nextRoute).toEqualTypeOf<typeof AppRoute.NoteDetail.Type>()
        return 1
      },
      Exited: previousRoute => {
        expectTypeOf(previousRoute).toEqualTypeOf<
          typeof AppRoute.NoteDetail.Type
        >()
        return 'exited'
      },
      Stayed: ({ previousRoute, nextRoute }) => {
        expectTypeOf(previousRoute).toEqualTypeOf<
          typeof AppRoute.NoteDetail.Type
        >()
        expectTypeOf(nextRoute).toEqualTypeOf<typeof AppRoute.NoteDetail.Type>()
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
            typeof AppRoute.NoteDetail.Type
          >()
          return 1
        },
        Exited: previousRoute => {
          expectTypeOf(previousRoute).toEqualTypeOf<
            typeof AppRoute.NoteDetail.Type
          >()
          return 'exited'
        },
        Stayed: ({ previousRoute, nextRoute }) => {
          expectTypeOf(previousRoute).toEqualTypeOf<
            typeof AppRoute.NoteDetail.Type
          >()
          expectTypeOf(nextRoute).toEqualTypeOf<
            typeof AppRoute.NoteDetail.Type
          >()
          return true
        },
      },
      () => undefined,
    )
    expectTypeOf(partial).toEqualTypeOf<number | string | boolean | undefined>()

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
        { Entered: (route: typeof AppRoute.Home.Type) => route },
        () => undefined,
      )
      // @ts-expect-error Invalid route tag
      isExiting(transition, 'Missing')
      // @ts-expect-error Invalid route tag
      isStaying(transition, 'Missing')
    }
  })

  it('constrains branch returns while inferring route payloads', () => {
    const PolicyMessage = defineMessageUnion({
      CompletedLoadDetail: {},
      CompletedPersistDraft: {},
    })
    type PolicyMessage = typeof PolicyMessage.Type
    const PolicyOutMessage = defineMessageUnion({
      EnteredDetail: {},
      ExitedDetail: {},
    })
    type PolicyOutMessage = typeof PolicyOutMessage.Type
    const PolicyModel = Schema.Struct({ activeId: Schema.String })
    type PolicyModel = typeof PolicyModel.Type

    class DetailService extends Context.Service<
      DetailService,
      Readonly<{ detail: string }>
    >()('DetailService') {}
    class DraftService extends Context.Service<
      DraftService,
      Readonly<{ draft: string }>
    >()('DraftService') {}

    const LoadDetail: Command.Command<PolicyMessage, never, DetailService> = {
      name: 'LoadDetail',
      effect: Effect.as(DetailService, PolicyMessage.CompletedLoadDetail()),
    }
    const PersistDraft: Command.Command<PolicyMessage, never, DraftService> = {
      name: 'PersistDraft',
      effect: Effect.as(DraftService, PolicyMessage.CompletedPersistDraft()),
    }
    const loadDetail: Update.Step<
      PolicyModel,
      PolicyMessage,
      DetailService
    > = model => ({ model, commands: [LoadDetail] })
    const persistDraft: Update.Step<
      PolicyModel,
      PolicyMessage,
      DraftService
    > = model => ({ model, commands: [PersistDraft] })
    const preserveModel: Update.Step<PolicyModel, PolicyMessage> = model => ({
      model,
    })
    type PolicyStep = Update.Step<
      PolicyModel,
      PolicyMessage,
      DetailService | DraftService
    >

    const transition = make<AppRoute>(note, nextNote)
    const policyStep = match<PolicyStep>()(transition, 'NoteDetail', {
      Entered: nextRoute => {
        expectTypeOf(nextRoute).toEqualTypeOf<typeof AppRoute.NoteDetail.Type>()
        return loadDetail
      },
      Exited: previousRoute => {
        expectTypeOf(previousRoute).toEqualTypeOf<
          typeof AppRoute.NoteDetail.Type
        >()
        return persistDraft
      },
      Stayed: ({ previousRoute, nextRoute }) => {
        expectTypeOf(previousRoute).toEqualTypeOf<
          typeof AppRoute.NoteDetail.Type
        >()
        expectTypeOf(nextRoute).toEqualTypeOf<typeof AppRoute.NoteDetail.Type>()
        return loadDetail
      },
      Unrelated: () => preserveModel,
    })
    const combinedPolicy = Update.combine([policyStep, preserveModel])
    expectTypeOf(combinedPolicy).toEqualTypeOf<PolicyStep>()
    expect(combinedPolicy({ activeId: '1' }).commands).toEqual([LoadDetail])

    const loadDetailAndNotify: Update.StepWithOutMessage<
      PolicyModel,
      PolicyMessage,
      PolicyOutMessage,
      DetailService
    > = model => ({
      model,
      commands: [LoadDetail],
      outMessage: PolicyOutMessage.EnteredDetail(),
    })
    const persistDraftAndNotify: Update.StepWithOutMessage<
      PolicyModel,
      PolicyMessage,
      PolicyOutMessage,
      DraftService
    > = model => ({
      model,
      commands: [PersistDraft],
      outMessage: PolicyOutMessage.ExitedDetail(),
    })
    const preserveModelAndNotify: Update.StepWithOutMessage<
      PolicyModel,
      PolicyMessage,
      PolicyOutMessage
    > = model => ({ model })
    type PolicyOutStep = Update.StepWithOutMessage<
      PolicyModel,
      PolicyMessage,
      PolicyOutMessage,
      DetailService | DraftService
    >

    const selectPolicyOutStep = (transition: Transition<AppRoute>) =>
      matchOrElse<PolicyOutStep>()(
        transition,
        'NoteDetail',
        {
          Entered: nextRoute => {
            expectTypeOf(nextRoute).toEqualTypeOf<
              typeof AppRoute.NoteDetail.Type
            >()
            return loadDetailAndNotify
          },
          Exited: previousRoute => {
            expectTypeOf(previousRoute).toEqualTypeOf<
              typeof AppRoute.NoteDetail.Type
            >()
            return persistDraftAndNotify
          },
        },
        () => preserveModelAndNotify,
      )
    const enteredOutStep = selectPolicyOutStep(
      make<AppRoute>(AppRoute.Home(), note),
    )
    const exitedOutStep = selectPolicyOutStep(
      make<AppRoute>(note, AppRoute.Home()),
    )
    expectTypeOf(enteredOutStep).toEqualTypeOf<PolicyOutStep>()
    expectTypeOf(exitedOutStep).toEqualTypeOf<PolicyOutStep>()
    expect(enteredOutStep({ activeId: '1' }).outMessage).toEqual(
      PolicyOutMessage.EnteredDetail(),
    )
    expect(exitedOutStep({ activeId: '1' }).outMessage).toEqual(
      PolicyOutMessage.ExitedDetail(),
    )

    if (false) {
      match<PolicyStep>()(transition, 'NoteDetail', {
        Entered: () => loadDetail,
        Exited: () => persistDraft,
        Stayed: () => preserveModel,
        // @ts-expect-error Handler must return PolicyStep
        Unrelated: () => 'unrelated',
      })
    }
  })
})

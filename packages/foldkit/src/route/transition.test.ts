import { Option, Schema as S } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import { r } from './index.js'
import { type RouteTransition, isTransitionTo } from './transition.js'

const Home = r('Home')
const Notes = r('Notes')
const NoteDetail = r('NoteDetail', { id: S.String })

type AppRoute = typeof Home.Type | typeof Notes.Type | typeof NoteDetail.Type

const isTransitionToNotes = isTransitionTo<AppRoute>('Notes')

describe('isTransitionTo', () => {
  it('is true when entering the target route from a different route', () => {
    const transition: RouteTransition<AppRoute> = {
      previousRoute: Option.some(Home()),
      nextRoute: Notes(),
    }
    expect(isTransitionToNotes(transition)).toBe(true)
  })

  it('is true on a cold load into the target route', () => {
    const transition: RouteTransition<AppRoute> = {
      previousRoute: Option.none(),
      nextRoute: Notes(),
    }
    expect(isTransitionToNotes(transition)).toBe(true)
  })

  it('is false when staying on the target route across two ids', () => {
    const isTransitionToNoteDetail = isTransitionTo<AppRoute>('NoteDetail')
    const transition: RouteTransition<AppRoute> = {
      previousRoute: Option.some(NoteDetail({ id: '1' })),
      nextRoute: NoteDetail({ id: '2' }),
    }
    expect(isTransitionToNoteDetail(transition)).toBe(false)
  })

  it('is false for a transition to a different route', () => {
    const transition: RouteTransition<AppRoute> = {
      previousRoute: Option.some(Home()),
      nextRoute: NoteDetail({ id: '1' }),
    }
    expect(isTransitionToNotes(transition)).toBe(false)
  })
})

describe('types', () => {
  it('a pinned alias narrows the tag argument to the route union tags', () => {
    const isTransitionToAppRoute = isTransitionTo<AppRoute>
    expectTypeOf(isTransitionToAppRoute)
      .parameter(0)
      .toEqualTypeOf<AppRoute['_tag']>()
    expectTypeOf(isTransitionToAppRoute)
      .parameter(0)
      .toEqualTypeOf<'Home' | 'Notes' | 'NoteDetail'>()
  })
})

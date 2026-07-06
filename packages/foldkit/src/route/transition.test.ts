import { Option, Schema as S } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import { r } from './index.js'
import { type RouteTransition, isEntering } from './transition.js'

const Home = r('Home')
const Notes = r('Notes')
const NoteDetail = r('NoteDetail', { id: S.String })

type AppRoute = typeof Home.Type | typeof Notes.Type | typeof NoteDetail.Type

const isEnteringNotes = isEntering<AppRoute>('Notes')

describe('isEntering', () => {
  it('is true when entering the target route from a different route', () => {
    const transition: RouteTransition<AppRoute> = {
      maybePreviousRoute: Option.some(Home()),
      nextRoute: Notes(),
    }
    expect(isEnteringNotes(transition)).toBe(true)
  })

  it('is true on a cold load into the target route', () => {
    const transition: RouteTransition<AppRoute> = {
      maybePreviousRoute: Option.none(),
      nextRoute: Notes(),
    }
    expect(isEnteringNotes(transition)).toBe(true)
  })

  it('is false when staying on the target route across two ids', () => {
    const isEnteringNoteDetail = isEntering<AppRoute>('NoteDetail')
    const transition: RouteTransition<AppRoute> = {
      maybePreviousRoute: Option.some(NoteDetail({ id: '1' })),
      nextRoute: NoteDetail({ id: '2' }),
    }
    expect(isEnteringNoteDetail(transition)).toBe(false)
  })

  it('is false for a transition to a different route', () => {
    const transition: RouteTransition<AppRoute> = {
      maybePreviousRoute: Option.some(Home()),
      nextRoute: NoteDetail({ id: '1' }),
    }
    expect(isEnteringNotes(transition)).toBe(false)
  })
})

describe('types', () => {
  it('a pinned alias narrows the tag argument to the route union tags', () => {
    const isEnteringAppRoute = isEntering<AppRoute>
    expectTypeOf(isEnteringAppRoute)
      .parameter(0)
      .toEqualTypeOf<AppRoute['_tag']>()
    expectTypeOf(isEnteringAppRoute)
      .parameter(0)
      .toEqualTypeOf<'Home' | 'Notes' | 'NoteDetail'>()
  })
})

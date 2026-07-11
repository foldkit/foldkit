import { Option, Schema as S } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import { r } from './index.js'
import {
  type Transition,
  coldLoad,
  entered,
  isEntering,
  make,
} from './transition.js'

const Home = r('Home')
const Notes = r('Notes')
const NoteDetail = r('NoteDetail', { id: S.String })

type AppRoute = typeof Home.Type | typeof Notes.Type | typeof NoteDetail.Type

const isEnteringNotes = isEntering<AppRoute>('Notes')

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

describe('isEntering', () => {
  it('is true when entering the target route from a different route', () => {
    expect(isEnteringNotes(make<AppRoute>(Home(), Notes()))).toBe(true)
  })

  it('is true on a cold load into the target route', () => {
    expect(isEnteringNotes(coldLoad(Notes()))).toBe(true)
  })

  it('is false when staying on the target route across two ids', () => {
    const isEnteringNoteDetail = isEntering<AppRoute>('NoteDetail')
    const transition = make<AppRoute>(
      NoteDetail({ id: '1' }),
      NoteDetail({ id: '2' }),
    )
    expect(isEnteringNoteDetail(transition)).toBe(false)
  })

  it('is false for a transition to a different route', () => {
    expect(
      isEnteringNotes(make<AppRoute>(Home(), NoteDetail({ id: '1' }))),
    ).toBe(false)
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

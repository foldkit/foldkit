import { Option } from 'effect'
import { Scene } from 'foldkit'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { AppRoute, Message, Model, update, view, viewTransition } from './main'

const gallery = Model.make({ route: AppRoute.Gallery(), filterText: '' })
const artworkDetail = (artworkId: number) =>
  Model.make({ route: AppRoute.Artwork({ artworkId }), filterText: '' })
const notFound = Model.make({
  route: AppRoute.NotFound({ path: '/nowhere' }),
  filterText: '',
})

const FILTER_PLACEHOLDER = 'Filter by title or medium…'

describe('gallery', () => {
  test('renders a card for every artwork', () => {
    Scene.scene(
      { update, view },
      Scene.given(gallery),
      Scene.expect(Scene.text('Dawn Chorus')).toExist(),
      Scene.expect(Scene.text('Deep Water')).toExist(),
      Scene.expect(Scene.text('Pollen')).toExist(),
    )
  })

  test('typing in the filter narrows the grid', () => {
    Scene.scene(
      { update, view },
      Scene.given(gallery),
      Scene.type(Scene.placeholder(FILTER_PLACEHOLDER), 'graphite'),
      Scene.expect(Scene.text('Graphite')).toExist(),
      Scene.expect(Scene.text('Dawn Chorus')).toBeAbsent(),
    )
  })

  test('a filter with no matches shows the empty state', () => {
    Scene.scene(
      { update, view },
      Scene.given(gallery),
      Scene.type(Scene.placeholder(FILTER_PLACEHOLDER), 'watercolor'),
      Scene.expect(Scene.text('No artworks match the filter.')).toExist(),
    )
  })
})

describe('artwork detail', () => {
  test('renders the artwork with its description and a back link', () => {
    Scene.scene(
      { update, view },
      Scene.given(artworkDetail(2)),
      Scene.expect(Scene.text('Deep Water')).toExist(),
      Scene.expect(Scene.role('link', { name: '← Back to gallery' })).toExist(),
    )
  })

  test('renders a missing state for an unknown artwork ID', () => {
    Scene.scene(
      { update, view },
      Scene.given(artworkDetail(999)),
      Scene.expect(Scene.text('Artwork not found')).toExist(),
    )
  })
})

describe('not found', () => {
  test('renders the missing path', () => {
    Scene.scene(
      { update, view },
      Scene.given(notFound),
      Scene.expect(Scene.text('Page not found')).toExist(),
    )
  })
})

describe('viewTransition', () => {
  const urlFor = (path: string) =>
    Option.getOrThrow(fromString(`http://localhost${path}`))

  test('transitions to-artwork-detail when the gallery gives way to an artwork', () => {
    const decision = viewTransition({
      previousModel: gallery,
      model: artworkDetail(1),
      message: Message.ChangedUrl({ url: urlFor('/artwork/1') }),
    })

    expect(decision).toEqual({ types: ['to-artwork-detail'] })
  })

  test('transitions to-gallery when an artwork gives way to the gallery', () => {
    const decision = viewTransition({
      previousModel: artworkDetail(1),
      model: gallery,
      message: Message.ChangedUrl({ url: urlFor('/') }),
    })

    expect(decision).toEqual({ types: ['to-gallery'] })
  })

  test('transitions untyped between two artworks', () => {
    const decision = viewTransition({
      previousModel: artworkDetail(1),
      model: artworkDetail(2),
      message: Message.ChangedUrl({ url: urlFor('/artwork/2') }),
    })

    expect(decision).toBe(true)
  })

  test('never transitions on filter keystrokes', () => {
    const decision = viewTransition({
      previousModel: gallery,
      model: gallery,
      message: Message.UpdatedFilterText({ filterText: 'g' }),
    })

    expect(decision).toBe(false)
  })
})

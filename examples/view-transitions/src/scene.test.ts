import { Option } from 'effect'
import { Scene } from 'foldkit'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import {
  ArtworkRoute,
  ChangedUrl,
  GalleryRoute,
  Model,
  NotFoundRoute,
  UpdatedFilterText,
  update,
  view,
  viewTransition,
} from './main'

const gallery = Model.make({ route: GalleryRoute(), filterText: '' })
const artworkDetail = (artworkId: number) =>
  Model.make({ route: ArtworkRoute({ artworkId }), filterText: '' })
const notFound = Model.make({
  route: NotFoundRoute({ path: '/nowhere' }),
  filterText: '',
})

const FILTER_PLACEHOLDER = 'Filter by title or medium…'

describe('gallery', () => {
  test('renders a card for every artwork', () => {
    Scene.scene(
      { update, view },
      Scene.with(gallery),
      Scene.expect(Scene.text('Dawn Chorus')).toExist(),
      Scene.expect(Scene.text('Deep Water')).toExist(),
      Scene.expect(Scene.text('Pollen')).toExist(),
    )
  })

  test('typing in the filter narrows the grid', () => {
    Scene.scene(
      { update, view },
      Scene.with(gallery),
      Scene.type(Scene.placeholder(FILTER_PLACEHOLDER), 'graphite'),
      Scene.expect(Scene.text('Graphite')).toExist(),
      Scene.expect(Scene.text('Dawn Chorus')).toBeAbsent(),
    )
  })

  test('a filter with no matches shows the empty state', () => {
    Scene.scene(
      { update, view },
      Scene.with(gallery),
      Scene.type(Scene.placeholder(FILTER_PLACEHOLDER), 'watercolor'),
      Scene.expect(Scene.text('No artworks match the filter.')).toExist(),
    )
  })
})

describe('artwork detail', () => {
  test('renders the artwork with its description and a back link', () => {
    Scene.scene(
      { update, view },
      Scene.with(artworkDetail(2)),
      Scene.expect(Scene.text('Deep Water')).toExist(),
      Scene.expect(Scene.role('link', { name: '← Back to gallery' })).toExist(),
    )
  })

  test('renders a missing state for an unknown artwork ID', () => {
    Scene.scene(
      { update, view },
      Scene.with(artworkDetail(999)),
      Scene.expect(Scene.text('Artwork not found')).toExist(),
    )
  })
})

describe('not found', () => {
  test('renders the missing path', () => {
    Scene.scene(
      { update, view },
      Scene.with(notFound),
      Scene.expect(Scene.text('Page not found')).toExist(),
    )
  })
})

describe('viewTransition', () => {
  const urlFor = (path: string) =>
    Option.getOrThrow(fromString(`http://localhost${path}`))

  test('transitions to-detail when the URL changes to an artwork', () => {
    const decision = viewTransition({
      model: artworkDetail(1),
      message: ChangedUrl({ url: urlFor('/artwork/1') }),
    })

    expect(decision).toEqual({ types: ['to-detail'] })
  })

  test('transitions to-gallery when the URL changes back to the gallery', () => {
    const decision = viewTransition({
      model: gallery,
      message: ChangedUrl({ url: urlFor('/') }),
    })

    expect(decision).toEqual({ types: ['to-gallery'] })
  })

  test('never transitions on filter keystrokes', () => {
    const decision = viewTransition({
      model: gallery,
      message: UpdatedFilterText({ filterText: 'g' }),
    })

    expect(decision).toBe(false)
  })
})

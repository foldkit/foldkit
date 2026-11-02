import { Option } from 'effect'
import { Scene } from 'foldkit'
import { fromString } from 'foldkit/url'

import { describe, expect, it } from '@effect/vitest'

import {
  ApplicationLive,
  ApplicationRoute,
  Message,
  Model,
  decideViewTransition,
} from './application'

const gallery = Model.make({
  route: ApplicationRoute.Gallery(),
  filterText: '',
})
const artworkDetail = (artworkId: number) =>
  Model.make({ route: ApplicationRoute.Artwork({ artworkId }), filterText: '' })
const notFound = Model.make({
  route: ApplicationRoute.NotFound({ path: '/nowhere' }),
  filterText: '',
})

const startArgs = {
  url: Option.getOrThrow(fromString('http://localhost/')),
}

const FILTER_PLACEHOLDER = 'Filter by title or medium…'

describe('gallery', () => {
  it.effect('renders a card for every artwork', () =>
    Scene.scene(
      ApplicationLive,
      startArgs,
      Scene.given(gallery),
      Scene.expect(Scene.text('Dawn Chorus')).toExist(),
      Scene.expect(Scene.text('Deep Water')).toExist(),
      Scene.expect(Scene.text('Pollen')).toExist(),
    ),
  )

  it.effect('typing in the filter narrows the grid', () =>
    Scene.scene(
      ApplicationLive,
      startArgs,
      Scene.given(gallery),
      Scene.type(Scene.placeholder(FILTER_PLACEHOLDER), 'graphite'),
      Scene.expect(Scene.text('Graphite')).toExist(),
      Scene.expect(Scene.text('Dawn Chorus')).toBeAbsent(),
    ),
  )

  it.effect('a filter with no matches shows the empty state', () =>
    Scene.scene(
      ApplicationLive,
      startArgs,
      Scene.given(gallery),
      Scene.type(Scene.placeholder(FILTER_PLACEHOLDER), 'watercolor'),
      Scene.expect(Scene.text('No artworks match the filter.')).toExist(),
    ),
  )
})

describe('artwork detail', () => {
  it.effect('renders the artwork with its description and a back link', () =>
    Scene.scene(
      ApplicationLive,
      startArgs,
      Scene.given(artworkDetail(2)),
      Scene.expect(Scene.text('Deep Water')).toExist(),
      Scene.expect(Scene.role('link', { name: '← Back to gallery' })).toExist(),
    ),
  )

  it.effect('renders a missing state for an unknown artwork ID', () =>
    Scene.scene(
      ApplicationLive,
      startArgs,
      Scene.given(artworkDetail(999)),
      Scene.expect(Scene.text('Artwork not found')).toExist(),
    ),
  )
})

describe('not found', () => {
  it.effect('renders the missing path', () =>
    Scene.scene(
      ApplicationLive,
      startArgs,
      Scene.given(notFound),
      Scene.expect(Scene.text('Page not found')).toExist(),
    ),
  )
})

describe('decideViewTransition', () => {
  const urlFor = (path: string) =>
    Option.getOrThrow(fromString(`http://localhost${path}`))

  it('transitions to-artwork-detail when the gallery gives way to an artwork', () => {
    const decision = decideViewTransition({
      previousModel: gallery,
      model: artworkDetail(1),
      message: Message.ChangedUrl({ url: urlFor('/artwork/1') }),
    })

    expect(decision).toEqual({ types: ['to-artwork-detail'] })
  })

  it('transitions to-gallery when an artwork gives way to the gallery', () => {
    const decision = decideViewTransition({
      previousModel: artworkDetail(1),
      model: gallery,
      message: Message.ChangedUrl({ url: urlFor('/') }),
    })

    expect(decision).toEqual({ types: ['to-gallery'] })
  })

  it('transitions untyped between two artworks', () => {
    const decision = decideViewTransition({
      previousModel: artworkDetail(1),
      model: artworkDetail(2),
      message: Message.ChangedUrl({ url: urlFor('/artwork/2') }),
    })

    expect(decision).toBe(true)
  })

  it('never transitions on filter keystrokes', () => {
    const decision = decideViewTransition({
      previousModel: gallery,
      model: gallery,
      message: Message.UpdatedFilterText({ filterText: 'g' }),
    })

    expect(decision).toBe(false)
  })
})

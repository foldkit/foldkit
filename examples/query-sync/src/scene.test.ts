import { Layer, Option } from 'effect'
import { expect, placeholder, role, scene, text } from 'foldkit/scene'
import { fromString } from 'foldkit/url'

import { describe, it } from '@effect/vitest'

import { ApplicationLive } from './application'
import { BrowseLive } from './browse'

const TestLive = ApplicationLive.pipe(Layer.provide(BrowseLive))

const urlArgs = (raw: string) => ({
  url: Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  ),
})

describe('view', () => {
  it.effect('the Browse route renders the heading and search input', () =>
    scene(
      TestLive,
      urlArgs('http://localhost/'),
      expect(role('heading', { name: 'Dinosaur Explorer' })).toExist(),
      expect(placeholder('Search by name…')).toExist(),
    ),
  )

  it.effect('rendering shows the total dinosaur count', () =>
    scene(
      TestLive,
      urlArgs('http://localhost/'),
      expect(text('Showing', { exact: false })).toContainText('dinosaurs'),
    ),
  )

  it.effect('typing in the search input updates its rendered value', () =>
    scene(
      TestLive,
      urlArgs('http://localhost/?search=Tyranno'),
      expect(placeholder('Search by name…')).toHaveValue('Tyranno'),
    ),
  )

  it.effect('a search with no matches shows the empty-state copy', () =>
    scene(
      TestLive,
      urlArgs('http://localhost/?search=zzzNoMatch'),
      expect(text('No dinosaurs match your filters.')).toExist(),
    ),
  )

  it.effect('NotFound shows a friendly 404 and a back link', () =>
    scene(
      TestLive,
      urlArgs('http://localhost/oops'),
      expect(role('heading', { name: '404 — Page Not Found' })).toExist(),
      expect(text('The path "/oops" was not found.')).toExist(),
      expect(role('link', { name: '← Back to Dinosaur Explorer' })).toExist(),
    ),
  )
})

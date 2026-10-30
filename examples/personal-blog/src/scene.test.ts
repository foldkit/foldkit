import { Layer, Option } from 'effect'
import { expect, given, role, scene, text } from 'foldkit/scene'
import { fromString } from 'foldkit/url'

import { describe, it } from '@effect/vitest'

import { ApplicationLive, ApplicationRoute } from './application'
import { CounterLive } from './counter'

const application = ApplicationLive.pipe(Layer.provide(CounterLive))

const startArgs = {
  url: Option.getOrThrow(fromString('http://localhost/')),
}

const initialCounter = { count: 0 }

const home = { route: ApplicationRoute.Home(), counter: initialCounter }
const postsIndex = { route: ApplicationRoute.Posts(), counter: initialCounter }
const post = (slug: string) => ({
  route: ApplicationRoute.Post({ slug }),
  counter: initialCounter,
})
const notFound = (path: string) => ({
  route: ApplicationRoute.NotFound({ path }),
  counter: initialCounter,
})

describe('view', () => {
  it.effect(
    'the header renders the site title and navigation on every route',
    () =>
      scene(
        application,
        startArgs,
        given(home),
        expect(role('link', { name: 'Devin Jameson' })).toExist(),
        expect(role('link', { name: 'About' })).toExist(),
        expect(role('link', { name: 'Posts' })).toExist(),
      ),
  )

  it.effect('the Home route renders the about prose from markdown', () =>
    scene(
      application,
      startArgs,
      given(home),
      expect(text('human man living in Boston', { exact: false })).toExist(),
      expect(role('link', { name: 'Foldkit' })).toExist(),
      expect(role('link', { name: 'August Health' })).toExist(),
    ),
  )

  it.effect('the Posts route lists every post with its summary', () =>
    scene(
      application,
      startArgs,
      given(postsIndex),
      expect(role('heading', { name: 'Making This Blog' })).toExist(),
      expect(role('heading', { name: 'Shooting Film' })).toExist(),
      expect(text('why film is pleasing', { exact: false })).toExist(),
    ),
  )

  it.effect('a post renders markdown headings, code, and blockquotes', () =>
    scene(
      application,
      startArgs,
      given(post('making-this-blog')),
      expect(role('heading', { name: 'Making This Blog' })).toExist(),
      expect(role('heading', { name: 'Why bother' })).toExist(),
      expect(role('heading', { name: 'The fold' })).toExist(),
      expect(text('proseView', { exact: false })).toExist(),
      expect(text('an app wearing prose', { exact: false })).toExist(),
    ),
  )

  it.effect('the Counter island renders live inside the post prose', () =>
    scene(
      application,
      startArgs,
      given(post('making-this-blog')),
      expect(text('Clicks while reading this post')).toExist(),
      expect(role('button', { name: '+' })).toExist(),
      expect(role('button', { name: '-' })).toExist(),
    ),
  )

  it.effect('the Note island wraps nested markdown content', () =>
    scene(
      application,
      startArgs,
      given(post('making-this-blog')),
      expect(text('Islands can wrap markdown too', { exact: false })).toExist(),
    ),
  )

  it.effect('a post renders markdown tables and ordered lists', () =>
    scene(
      application,
      startArgs,
      given(post('shooting-film')),
      expect(role('table')).toExist(),
      expect(text('Low light, pushed')).toExist(),
      expect(text('Ektar 100 for daylight and saturated color')).toExist(),
    ),
  )

  it.effect('an unknown post slug renders the missing panel', () =>
    scene(
      application,
      startArgs,
      given(post('missing-post')),
      expect(role('heading', { name: 'Post Not Found' })).toExist(),
      expect(text('There is no post named "missing-post".')).toExist(),
    ),
  )

  it.effect('an unmatched URL renders the NotFound view', () =>
    scene(
      application,
      startArgs,
      given(notFound('/missing')),
      expect(role('heading', { name: '404' })).toExist(),
      expect(role('link', { name: '← Go home' })).toExist(),
    ),
  )
})

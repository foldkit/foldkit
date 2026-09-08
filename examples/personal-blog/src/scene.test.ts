import { expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { Counter } from './island'
import { AppRoute, Model, update, view } from './main'

const home = Model.make({ route: AppRoute.Home(), counter: Counter.init })
const postsIndex = Model.make({
  route: AppRoute.Posts(),
  counter: Counter.init,
})
const post = (slug: string) =>
  Model.make({ route: AppRoute.Post({ slug }), counter: Counter.init })
const notFound = (path: string) =>
  Model.make({ route: AppRoute.NotFound({ path }), counter: Counter.init })

describe('view', () => {
  test('the header renders the site title and navigation on every route', () => {
    scene(
      { update, view },
      given(home),
      expect(role('link', { name: 'Devin Jameson' })).toExist(),
      expect(role('link', { name: 'About' })).toExist(),
      expect(role('link', { name: 'Posts' })).toExist(),
    )
  })

  test('the Home route renders the about prose from markdown', () => {
    scene(
      { update, view },
      given(home),
      expect(text('human man living in Boston', { exact: false })).toExist(),
      expect(role('link', { name: 'Foldkit' })).toExist(),
      expect(role('link', { name: 'August Health' })).toExist(),
    )
  })

  test('the Posts route lists every post with its summary', () => {
    scene(
      { update, view },
      given(postsIndex),
      expect(role('heading', { name: 'Making This Blog' })).toExist(),
      expect(role('heading', { name: 'Shooting Film' })).toExist(),
      expect(text('why film is pleasing', { exact: false })).toExist(),
    )
  })

  test('a post renders markdown headings, code, and blockquotes', () => {
    scene(
      { update, view },
      given(post('making-this-blog')),
      expect(role('heading', { name: 'Making This Blog' })).toExist(),
      expect(role('heading', { name: 'Why bother' })).toExist(),
      expect(role('heading', { name: 'The fold' })).toExist(),
      expect(text('proseView', { exact: false })).toExist(),
      expect(text('an app wearing prose', { exact: false })).toExist(),
    )
  })

  test('the Counter island renders live inside the post prose', () => {
    scene(
      { update, view },
      given(post('making-this-blog')),
      expect(text('Clicks while reading this post')).toExist(),
      expect(role('button', { name: '+' })).toExist(),
      expect(role('button', { name: '-' })).toExist(),
    )
  })

  test('the Note island wraps nested markdown content', () => {
    scene(
      { update, view },
      given(post('making-this-blog')),
      expect(text('Islands can wrap markdown too', { exact: false })).toExist(),
    )
  })

  test('a post renders markdown tables and ordered lists', () => {
    scene(
      { update, view },
      given(post('shooting-film')),
      expect(role('table')).toExist(),
      expect(text('Low light, pushed')).toExist(),
      expect(text('Ektar 100 for daylight and saturated color')).toExist(),
    )
  })

  test('an unknown post slug renders the missing panel', () => {
    scene(
      { update, view },
      given(post('missing-post')),
      expect(role('heading', { name: 'Post Not Found' })).toExist(),
      expect(text('There is no post named "missing-post".')).toExist(),
    )
  })

  test('an unmatched URL renders the NotFound view', () => {
    scene(
      { update, view },
      given(notFound('/missing')),
      expect(role('heading', { name: '404' })).toExist(),
      expect(role('link', { name: '← Go home' })).toExist(),
    )
  })
})

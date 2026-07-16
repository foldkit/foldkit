import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { Counter } from './island'
import {
  HomeRoute,
  Model,
  NotFoundRoute,
  PostRoute,
  PostsRoute,
  update,
  view,
} from './main'

const home = Model.make({ route: HomeRoute(), counter: Counter.init })
const postsIndex = Model.make({ route: PostsRoute(), counter: Counter.init })
const post = (slug: string) =>
  Model.make({ route: PostRoute({ slug }), counter: Counter.init })
const notFound = (path: string) =>
  Model.make({ route: NotFoundRoute({ path }), counter: Counter.init })

describe('view', () => {
  test('the header renders the site title and navigation on every route', () => {
    Scene.scene(
      { update, view },
      Scene.with(home),
      Scene.expect(Scene.role('link', { name: 'Devin Jameson' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'About' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'Posts' })).toExist(),
    )
  })

  test('the Home route renders the about prose from markdown', () => {
    Scene.scene(
      { update, view },
      Scene.with(home),
      Scene.expect(
        Scene.text('human man living in Boston', { exact: false }),
      ).toExist(),
      Scene.expect(Scene.role('link', { name: 'Foldkit' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'August Health' })).toExist(),
    )
  })

  test('the Posts route lists every post with its summary', () => {
    Scene.scene(
      { update, view },
      Scene.with(postsIndex),
      Scene.expect(
        Scene.role('heading', { name: 'Making This Blog' }),
      ).toExist(),
      Scene.expect(Scene.role('heading', { name: 'Shooting Film' })).toExist(),
      Scene.expect(
        Scene.text('why film is pleasing', { exact: false }),
      ).toExist(),
    )
  })

  test('a post renders markdown headings, code, and blockquotes', () => {
    Scene.scene(
      { update, view },
      Scene.with(post('making-this-blog')),
      Scene.expect(
        Scene.role('heading', { name: 'Making This Blog' }),
      ).toExist(),
      Scene.expect(Scene.role('heading', { name: 'Why bother' })).toExist(),
      Scene.expect(Scene.role('heading', { name: 'The fold' })).toExist(),
      Scene.expect(Scene.text('proseView', { exact: false })).toExist(),
      Scene.expect(
        Scene.text('an app wearing prose', { exact: false }),
      ).toExist(),
    )
  })

  test('the Counter island renders live inside the post prose', () => {
    Scene.scene(
      { update, view },
      Scene.with(post('making-this-blog')),
      Scene.expect(Scene.text('Clicks while reading this post')).toExist(),
      Scene.expect(Scene.role('button', { name: '+' })).toExist(),
      Scene.expect(Scene.role('button', { name: '-' })).toExist(),
    )
  })

  test('the Note island wraps nested markdown content', () => {
    Scene.scene(
      { update, view },
      Scene.with(post('making-this-blog')),
      Scene.expect(
        Scene.text('Islands can wrap markdown too', { exact: false }),
      ).toExist(),
    )
  })

  test('a post renders markdown tables and ordered lists', () => {
    Scene.scene(
      { update, view },
      Scene.with(post('shooting-film')),
      Scene.expect(Scene.role('table')).toExist(),
      Scene.expect(Scene.text('Low light, pushed')).toExist(),
      Scene.expect(
        Scene.text('Ektar 100 for daylight and saturated color'),
      ).toExist(),
    )
  })

  test('an unknown post slug renders the missing panel', () => {
    Scene.scene(
      { update, view },
      Scene.with(post('missing-post')),
      Scene.expect(Scene.role('heading', { name: 'Post Not Found' })).toExist(),
      Scene.expect(
        Scene.text('There is no post named "missing-post".'),
      ).toExist(),
    )
  })

  test('an unmatched URL renders the NotFound view', () => {
    Scene.scene(
      { update, view },
      Scene.with(notFound('/missing')),
      Scene.expect(Scene.role('heading', { name: '404' })).toExist(),
      Scene.expect(Scene.role('link', { name: '← Go home' })).toExist(),
    )
  })
})

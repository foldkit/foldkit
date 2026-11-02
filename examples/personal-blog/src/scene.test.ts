import { Effect } from 'effect'
import { expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { ApplicationBlock } from './block'
import { CounterBlock } from './island'
import { Model } from './model'
import { ApplicationRoute } from './route'

const home = Model.make({
  route: ApplicationRoute.Home(),
  counter: CounterBlock.Model.make({ count: 0 }),
})
const postsIndex = Model.make({
  route: ApplicationRoute.Posts(),
  counter: CounterBlock.Model.make({ count: 0 }),
})
const post = (slug: string) =>
  Model.make({
    route: ApplicationRoute.Post({ slug }),
    counter: CounterBlock.Model.make({ count: 0 }),
  })
const notFound = (path: string) =>
  Model.make({
    route: ApplicationRoute.NotFound({ path }),
    counter: CounterBlock.Model.make({ count: 0 }),
  })

describe('view', () => {
  test('the header renders the site title and navigation on every route', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(home),
        expect(role('link', { name: 'Devin Jameson' })).toExist(),
        expect(role('link', { name: 'About' })).toExist(),
        expect(role('link', { name: 'Posts' })).toExist(),
      ),
    )
  })

  test('the Home route renders the about prose from markdown', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(home),
        expect(text('human man living in Boston', { exact: false })).toExist(),
        expect(role('link', { name: 'Foldkit' })).toExist(),
        expect(role('link', { name: 'August Health' })).toExist(),
      ),
    )
  })

  test('the Posts route lists every post with its summary', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(postsIndex),
        expect(role('heading', { name: 'Making This Blog' })).toExist(),
        expect(role('heading', { name: 'Shooting Film' })).toExist(),
        expect(text('why film is pleasing', { exact: false })).toExist(),
      ),
    )
  })

  test('a post renders markdown headings, code, and blockquotes', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(post('making-this-blog')),
        expect(role('heading', { name: 'Making This Blog' })).toExist(),
        expect(role('heading', { name: 'Why bother' })).toExist(),
        expect(role('heading', { name: 'The fold' })).toExist(),
        expect(text('proseView', { exact: false })).toExist(),
        expect(text('an app wearing prose', { exact: false })).toExist(),
      ),
    )
  })

  test('the Counter island renders live inside the post prose', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(post('making-this-blog')),
        expect(text('Clicks while reading this post')).toExist(),
        expect(role('button', { name: '+' })).toExist(),
        expect(role('button', { name: '-' })).toExist(),
      ),
    )
  })

  test('the Note island wraps nested markdown content', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(post('making-this-blog')),
        expect(
          text('Islands can wrap markdown too', { exact: false }),
        ).toExist(),
      ),
    )
  })

  test('a post renders markdown tables and ordered lists', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(post('shooting-film')),
        expect(role('table')).toExist(),
        expect(text('Low light, pushed')).toExist(),
        expect(text('Ektar 100 for daylight and saturated color')).toExist(),
      ),
    )
  })

  test('an unknown post slug renders the missing panel', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(post('missing-post')),
        expect(role('heading', { name: 'Post Not Found' })).toExist(),
        expect(text('There is no post named "missing-post".')).toExist(),
      ),
    )
  })

  test('an unmatched URL renders the NotFound view', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(notFound('/missing')),
        expect(role('heading', { name: '404' })).toExist(),
        expect(role('link', { name: '← Go home' })).toExist(),
      ),
    )
  })
})

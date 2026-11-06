import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { CounterBlock } from './blocks'
import { ApplicationBlock, layer } from './index'
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
  it.effect(
    'the header renders the site title and navigation on every route',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(home),
        Scene.expect(Scene.role('link', { name: 'Devin Jameson' })).toExist(),
        Scene.expect(Scene.role('link', { name: 'About' })).toExist(),
        Scene.expect(Scene.role('link', { name: 'Posts' })).toExist(),
      ),
  )

  it.effect('the Home route renders the about prose from markdown', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(home),
      Scene.expect(
        Scene.text('human man living in Boston', { exact: false }),
      ).toExist(),
      Scene.expect(Scene.role('link', { name: 'Foldkit' })).toExist(),
      Scene.expect(Scene.role('link', { name: 'August Health' })).toExist(),
    ),
  )

  it.effect('the Posts route lists every post with its summary', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(postsIndex),
      Scene.expect(
        Scene.role('heading', { name: 'Making This Blog' }),
      ).toExist(),
      Scene.expect(Scene.role('heading', { name: 'Shooting Film' })).toExist(),
      Scene.expect(
        Scene.text('why film is pleasing', { exact: false }),
      ).toExist(),
    ),
  )

  it.effect('a post renders markdown headings, code, and blockquotes', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(post('making-this-blog')),
      Scene.expect(
        Scene.role('heading', { name: 'Making This Blog' }),
      ).toExist(),
      Scene.expect(Scene.role('heading', { name: 'Why bother' })).toExist(),
      Scene.expect(Scene.role('heading', { name: 'The fold' })).toExist(),
      Scene.expect(Scene.text('proseView', { exact: false })).toExist(),
      Scene.expect(
        Scene.text('an app wearing prose', { exact: false }),
      ).toExist(),
    ),
  )

  it.effect('the Counter island renders live inside the post prose', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(post('making-this-blog')),
      Scene.expect(Scene.text('Clicks while reading this post')).toExist(),
      Scene.expect(Scene.role('button', { name: '+' })).toExist(),
      Scene.expect(Scene.role('button', { name: '-' })).toExist(),
    ),
  )

  it.effect('the Note island wraps nested markdown content', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(post('making-this-blog')),
      Scene.expect(
        Scene.text('Islands can wrap markdown too', { exact: false }),
      ).toExist(),
    ),
  )

  it.effect('a post renders markdown tables and ordered lists', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(post('shooting-film')),
      Scene.expect(Scene.role('table')).toExist(),
      Scene.expect(Scene.text('Low light, pushed')).toExist(),
      Scene.expect(
        Scene.text('Ektar 100 for daylight and saturated color'),
      ).toExist(),
    ),
  )

  it.effect('an unknown post slug renders the missing panel', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(post('missing-post')),
      Scene.expect(Scene.role('heading', { name: 'Post Not Found' })).toExist(),
      Scene.expect(
        Scene.text('There is no post named "missing-post".'),
      ).toExist(),
    ),
  )

  it.effect('an unmatched URL renders the NotFound view', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(notFound('/missing')),
      Scene.expect(Scene.role('heading', { name: '404' })).toExist(),
      Scene.expect(Scene.role('link', { name: '← Go home' })).toExist(),
    ),
  )
})

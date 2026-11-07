import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { Query } from 'foldkit/experimental'
import { defineMessageUnion } from 'foldkit/message'

import { postsQuery } from './queryDefine'

export const Model = Schema.Struct({
  posts: postsQuery.Model,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedRefreshPosts: {},
})
export type Message = typeof Message.Type

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

const { makeRequiredFieldBinding, makeComposition } = ApplicationBlock

const PostsBinding = makeRequiredFieldBinding(postsQuery, {
  field: 'posts',
})

const ApplicationComposition = makeComposition({
  bindings: [PostsBinding],
})

const init = ApplicationComposition.makeInit(() => ({
  model: {},
  // Start loading after the Query Model is stored in its parent.
  steps: [PostsBinding.requestLoadIfMissing()],
}))

const update = ApplicationComposition.makeUpdate({
  // Return the transition and Command for either missing or retained data.
  ClickedRefreshPosts: model => PostsBinding.requestRevalidationOrLoad()(model),
})

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* ApplicationComposition.acquireChildren()

    return {
      children,
      init,
      update,
    }
  }),
).pipe(Layer.provide(Query.layer))

import { Effect, Schema } from 'effect'
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

const ApplicationKey = Symbol('Application')

const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),
  Model,
  Message,
})

const PostsBinding = ApplicationDefinition.makeBinding(postsQuery, {
  field: 'posts',
})

const ApplicationComposition = ApplicationDefinition.makeComposition({
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

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const posts = yield* PostsBinding

    return { children: [posts], init, update }
  }),
).provide(Query.layer)

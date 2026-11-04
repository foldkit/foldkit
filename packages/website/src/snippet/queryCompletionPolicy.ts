import { Effect, Layer, Option, Result, Schema } from 'effect'
import { Block } from 'foldkit'
import { Query } from 'foldkit/experimental'

import { postQuery } from './queryKeyedDefine'

const Model = Schema.Struct({
  postDetails: postQuery.Model,
  maybeNotice: Schema.Option(Schema.String),
})
type Model = typeof Model.Type

export const ApplicationKey = Symbol('Application')

export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),

  Model,
  Message: Schema.Never,
})

const PostDetailsBinding = ApplicationBlock.makeBinding(postQuery, {
  field: 'postDetails',
}).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(postQuery, {
    CompletedFetch: ({ args, result }) =>
      Result.isFailure(result)
        ? ApplicationBlock.makeFieldsStep(() => ({
            maybeNotice: () =>
              Option.some(
                `Could not load post ${args.postId}: ${result.failure}`,
              ),
          }))
        : ApplicationBlock.makeNoopStep(),
  }),
})

const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [PostDetailsBinding],
})
const init = ApplicationComposition.makeInit(() => ({
  model: { maybeNotice: Option.none() },
}))
const update = ApplicationComposition.makeUpdate({})

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const postDetails = yield* PostDetailsBinding

    return {
      children: [postDetails],
      init,
      update,
    }
  }),
).pipe(Layer.provide(Query.layer))

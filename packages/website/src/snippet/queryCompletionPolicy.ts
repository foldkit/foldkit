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
  InitArgs: Schema.Tuple([]),

  Model,
  Message: Schema.Never,
})

const {
  makeRequiredFieldBinding,
  makeOutMessageFold,
  makeFieldsStep,
  makeNoopStep,
  makeComposition,
} = ApplicationBlock

const PostDetailsBinding = makeRequiredFieldBinding(postQuery, {
  field: 'postDetails',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(postQuery, {
    CompletedFetch: ({ args, result }) =>
      Result.isFailure(result)
        ? makeFieldsStep(() => ({
            maybeNotice: () =>
              Option.some(
                `Could not load post ${args.postId}: ${result.failure}`,
              ),
          }))
        : makeNoopStep(),
  }),
})

const ApplicationComposition = makeComposition({
  bindings: [PostDetailsBinding],
})
const init = ApplicationComposition.makeInit(() => ({
  model: { maybeNotice: Option.none() },
}))
const update = ApplicationComposition.makeUpdate({})

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

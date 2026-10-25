import { Context, Effect, Tuple } from 'effect'
import { Block } from 'foldkit'

import { ChildDefinition } from './schema-boundary-definition.js'
import { Message } from './schema-boundary-message.js'
import { Count, Model } from './schema-boundary-model.js'
export class Store extends Context.Service<
  Store,
  Readonly<{ load: (key: 'Primary' | 'Secondary') => Effect.Effect<number> }>
>()('PublicModelBoundary/Store') {}
export const Load = ChildDefinition.makeCommand('Load', {
  args: { key: Message.RequestedLoad.fields.key },
  messages: [Message.CompletedLoad],
  handler: function* () {
    const store = yield* Store
    return ({ key }) =>
      Effect.map(store.load(key), count =>
        Message.CompletedLoad({ count: Count.make(count) }),
      )
  },
})
export const ChildComposition = ChildDefinition.makeComposition()
export const init = ChildComposition.makeInit(() => ({
  model: Model.make({ count: Count.make(0) }),
}))
export const update = ChildComposition.makeUpdate({
  RequestedLoad: (model, { key }) => ({ model, commands: [Load({ key })] }),
  CompletedLoad: (model, { count }) => ({ model: Model.make({ count }) }),
})
const prepare = () =>
  ChildComposition.prepareBlock({
    init,
    update,
    operations: {
      load: (key: 'Primary' | 'Secondary') =>
        Tuple.make(Message.RequestedLoad({ key })),
    },
    EffectsLayer: Load.layer,
  })
export const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

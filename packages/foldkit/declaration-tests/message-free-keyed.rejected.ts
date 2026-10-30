import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

import {
  Entry,
  GeneralKeyedBinding,
  ParentDefinition,
  ParentModel,
  SilentBlock,
} from './message-free-keyed.accepted.js'

// @ts-expect-error An exact Message-free child rejects obsolete outgoing Message mappers.
ParentDefinition.makeBinding(SilentBlock, {
  placement: 'mapped-silent',
  readAll: (model: typeof ParentModel.Type) => model.entries,
  key: (entry: typeof Entry.Type) => entry.key,
  read: (entry: typeof Entry.Type) => entry.silent,
  writeAt: (model: typeof ParentModel.Type, _key, _nextSilent) => model,
  toParentMessage: () => ({ _tag: 'ClickedParent' }),
})

const MessagefulMessage = defineMessageUnion({ ChangedReady: {} })
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const MessagefulComposition = Block.makeDefinition(
  'StrictRoutingGeneralKeyedMessageful',
  {
    Model: Schema.Struct({ ready: Schema.Boolean }),
    Message: MessagefulMessage,
  },
).makeComposition()
const prepareMessagefulBlock = () =>
  MessagefulComposition.prepareBlock({
    init: MessagefulComposition.makeInit(() => ({ model: { ready: false } })),
    update: MessagefulComposition.makeUpdate({
      ChangedReady: model => ({ model }),
    }),
  })
const MessagefulBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof MessagefulComposition.Model,
  typeof prepareMessagefulBlock
> = Block.assemble(prepareMessagefulBlock)

// @ts-expect-error A messageful general keyed Binding requires an exact key Schema for generated delivery.
ParentDefinition.makeBinding(MessagefulBlock, {
  readAll: (model: typeof ParentModel.Type) => model.entries,
  key: (entry: typeof Entry.Type) => entry.key,
  read: (entry: typeof Entry.Type) =>
    MessagefulBlock.Model.make({ ready: entry.silent.ready }),
  writeAt: (model: typeof ParentModel.Type, _key, _nextChild) => model,
})

const omittedInitialization = ParentDefinition.makeStep((model, key: string) =>
  GeneralKeyedBinding.init({
    key,
    args: [key],
    toParentModel: () => model,
  }),
)
const OmittedComposition = ParentDefinition.makeComposition()
const omittedUpdate = OmittedComposition.makeUpdate({
  ClickedParent: (model, _message) =>
    // @ts-expect-error The omitted Binding's initialization requires graph capability at application.
    omittedInitialization(model, 'one'),
})

// @ts-expect-error Connected initialization requires its message-free Binding to be registered.
OmittedComposition.prepareBlock({
  init: OmittedComposition.makeInit(() => ({
    model: ParentModel.make({ entries: [] }),
  })),
  update: omittedUpdate,
})

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct literal Block identity for type coverage.
const SilentComposition = Block.makeDefinition('InvalidSilentExposure', {
  Model: SilentBlock.Model,
  Message: Schema.Never,
}).makeComposition()
SilentComposition.prepareBlock({
  init: SilentComposition.makeInit((id: string) => ({
    model: SilentBlock.Model.make({ id, ready: false }),
  })),
  update: SilentComposition.makeUpdate({}),
  operations: {
    // @ts-expect-error A Message-free Block cannot expose a hidden Model mutation.
    markReady: (model: typeof SilentBlock.Model.Type) => ({ model }),
  },
})

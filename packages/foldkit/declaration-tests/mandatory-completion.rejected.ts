import { Layer, Schema } from 'effect'
import { Block, Program } from 'foldkit'
import * as Server from 'foldkit/experimental/server'

import {
  HostSaveLayer,
  Model,
  PageDraft,
  Viewed,
  ViewedDraft,
  prepareViewed,
} from './mandatory-completion.accepted.js'

// @ts-expect-error An assembly draft exposes no Model member.
ViewedDraft.Model

const DraftModel = Schema.Struct({
  // @ts-expect-error A draft Model cannot enter another Schema.
  child: ViewedDraft.Model,
  // @ts-expect-error A draft Model cannot enter a nested Option Schema.
  maybeChild: Schema.Option(ViewedDraft.Model),
  // @ts-expect-error A draft Model cannot enter a nested Array Schema.
  children: Schema.Array(ViewedDraft.Model),
})
const DraftParentDefinition = Block.makeDefinition(
  'MandatoryCompletionDraftParent',
  { Model: DraftModel, Message: Schema.Never },
)

// @ts-expect-error Bindings accept completed Blocks, not assembly drafts.
DraftParentDefinition.makeBinding(ViewedDraft, { field: 'child' })

// @ts-expect-error Element Programs accept completed Blocks, not assembly drafts.
Program.makeElement({ block: ViewedDraft, container: null })

// @ts-expect-error Page Programs accept completed Blocks, not assembly drafts.
Program.make({ block: PageDraft, container: null })

void Server.renderToString(
  // @ts-expect-error Server rendering accepts a completed page Block, not a draft.
  PageDraft,
  {},
  { isHydratable: false },
)

// @ts-expect-error A draft is not a completed Block.
export const DraftAsAnyBlock: Block.AnyBlock = ViewedDraft

// @ts-expect-error A draft is not the completed Block produced from it.
export const DraftAsCompleted: typeof Viewed = ViewedDraft

type ViewedHeader = Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareViewed
>
// @ts-expect-error A FromAssembly header describes the completed Block.
export const DraftAsAnnotated: ViewedHeader = ViewedDraft

// @ts-expect-error Layer replacement is unavailable until completion.
ViewedDraft.replaceEffectsLayer(Layer.empty)

// @ts-expect-error Host handler provision is unavailable until completion.
ViewedDraft.provideHandlers(HostSaveLayer)

// @ts-expect-error Block.assemble requires the adjacent FromAssembly header.
export const MissingHeader = Block.assemble(prepareViewed)

declare const anyProducer: any
declare const neverProducer: never
declare const anyResultProducer: () => any
declare const neverResultProducer: () => never

// @ts-expect-error An any producer cannot bypass the checked annotation.
Block.assemble(anyProducer)

// @ts-expect-error A never producer cannot bypass the checked annotation.
Block.assemble(neverProducer)

// @ts-expect-error An any result cannot bypass the checked annotation.
Block.assemble(anyResultProducer)

// @ts-expect-error A never result cannot bypass the checked annotation.
Block.assemble(neverResultProducer)

// @ts-expect-error Supplying only Model cannot infer the required producer header.
Block.assemble<typeof Model>(prepareViewed)

const produceFinishedBlock = () => Viewed
type FinishedProducer = typeof produceFinishedBlock
// @ts-expect-error A completion producer must return the original assembly draft.
export const CompletedProducer = Block.assemble<typeof Model, FinishedProducer>(
  produceFinishedBlock,
)

// @ts-expect-error A producer function is not a completed Block.
export const ProducerAsBlock: Block.AnyBlock = prepareViewed

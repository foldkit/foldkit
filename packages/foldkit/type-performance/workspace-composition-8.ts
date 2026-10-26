import { Context, Effect, Layer, Option, Schema } from 'effect'
import { Program } from 'foldkit'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import type { Element as ElementProgram } from 'foldkit/program'
import * as Update from 'foldkit/update'

import {
  WorkspaceGroup001Block,
  WorkspaceGroup002Block,
  WorkspaceGroup003Block,
  WorkspaceGroup004Block,
  WorkspaceGroup005Block,
  WorkspaceGroup006Block,
  WorkspaceGroup007Block,
  WorkspaceGroup008Block,
} from './workspace-groups-8.js'
import { WorkspaceStore, WorkspaceStoreLayer } from './workspace-shared.js'

const WarmupModel = Schema.Struct({ value: Schema.Number })
const WarmupMessage = defineMessageUnion({ CompletedWarmup: {} })

// oxlint-disable-next-line effecttsgo/floating-effect
Effect.void
Layer.empty
Option.none()
Block.makeDefinition('Application', {
  Model: WarmupModel,
  Message: WarmupMessage,
})
Context.Service
Block.makeDefinition('TypePerformanceWarmup', {
  Model: WarmupModel,
  Message: WarmupMessage,
})

export type WarmupStep = Update.Step<
  typeof WarmupModel.Type,
  typeof WarmupMessage.Type
>
export type WarmupElement = ElementProgram

const ApplicationModel = Schema.Struct({
  maybeLastSavedIssueId: Schema.Option(Schema.String),
  workspaceGroup001: WorkspaceGroup001Block.Model,
  workspaceGroup002: WorkspaceGroup002Block.Model,
  workspaceGroup003: WorkspaceGroup003Block.Model,
  workspaceGroup004: WorkspaceGroup004Block.Model,
  workspaceGroup005: WorkspaceGroup005Block.Model,
  workspaceGroup006: WorkspaceGroup006Block.Model,
  workspaceGroup007: WorkspaceGroup007Block.Model,
  workspaceGroup008: WorkspaceGroup008Block.Model,
})
const ApplicationMessage = Schema.Never
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model: ApplicationModel,
  Message: ApplicationMessage,
})
const WorkspaceGroup001Binding = ApplicationDefinition.makeBinding(
  WorkspaceGroup001Block,
  {
    field: 'workspaceGroup001',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(WorkspaceGroup001Block, {
    SavedIssue: ({ groupId, issueId }) =>
      ApplicationDefinition.makeFieldsStep(() => ({
        maybeLastSavedIssueId: () => Option.some(groupId + ':' + issueId),
      })),
  }),
})
const WorkspaceGroup002Binding = ApplicationDefinition.makeBinding(
  WorkspaceGroup002Block,
  {
    field: 'workspaceGroup002',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(WorkspaceGroup002Block, {
    SavedIssue: ({ groupId, issueId }) =>
      ApplicationDefinition.makeFieldsStep(() => ({
        maybeLastSavedIssueId: () => Option.some(groupId + ':' + issueId),
      })),
  }),
})
const WorkspaceGroup003Binding = ApplicationDefinition.makeBinding(
  WorkspaceGroup003Block,
  {
    field: 'workspaceGroup003',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(WorkspaceGroup003Block, {
    SavedIssue: ({ groupId, issueId }) =>
      ApplicationDefinition.makeFieldsStep(() => ({
        maybeLastSavedIssueId: () => Option.some(groupId + ':' + issueId),
      })),
  }),
})
const WorkspaceGroup004Binding = ApplicationDefinition.makeBinding(
  WorkspaceGroup004Block,
  {
    field: 'workspaceGroup004',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(WorkspaceGroup004Block, {
    SavedIssue: ({ groupId, issueId }) =>
      ApplicationDefinition.makeFieldsStep(() => ({
        maybeLastSavedIssueId: () => Option.some(groupId + ':' + issueId),
      })),
  }),
})
const WorkspaceGroup005Binding = ApplicationDefinition.makeBinding(
  WorkspaceGroup005Block,
  {
    field: 'workspaceGroup005',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(WorkspaceGroup005Block, {
    SavedIssue: ({ groupId, issueId }) =>
      ApplicationDefinition.makeFieldsStep(() => ({
        maybeLastSavedIssueId: () => Option.some(groupId + ':' + issueId),
      })),
  }),
})
const WorkspaceGroup006Binding = ApplicationDefinition.makeBinding(
  WorkspaceGroup006Block,
  {
    field: 'workspaceGroup006',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(WorkspaceGroup006Block, {
    SavedIssue: ({ groupId, issueId }) =>
      ApplicationDefinition.makeFieldsStep(() => ({
        maybeLastSavedIssueId: () => Option.some(groupId + ':' + issueId),
      })),
  }),
})
const WorkspaceGroup007Binding = ApplicationDefinition.makeBinding(
  WorkspaceGroup007Block,
  {
    field: 'workspaceGroup007',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(WorkspaceGroup007Block, {
    SavedIssue: ({ groupId, issueId }) =>
      ApplicationDefinition.makeFieldsStep(() => ({
        maybeLastSavedIssueId: () => Option.some(groupId + ':' + issueId),
      })),
  }),
})
const WorkspaceGroup008Binding = ApplicationDefinition.makeBinding(
  WorkspaceGroup008Block,
  {
    field: 'workspaceGroup008',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(WorkspaceGroup008Block, {
    SavedIssue: ({ groupId, issueId }) =>
      ApplicationDefinition.makeFieldsStep(() => ({
        maybeLastSavedIssueId: () => Option.some(groupId + ':' + issueId),
      })),
  }),
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [
    WorkspaceGroup001Binding,
    WorkspaceGroup002Binding,
    WorkspaceGroup003Binding,
    WorkspaceGroup004Binding,
    WorkspaceGroup005Binding,
    WorkspaceGroup006Binding,
    WorkspaceGroup007Binding,
    WorkspaceGroup008Binding,
  ],
})
type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
const workspaceContentView = (
  model: typeof ApplicationModel.Type,
  h: ApplicationViewBuilder,
) =>
  h.main(
    [],
    [
      h.block(
        WorkspaceGroup001Binding.embedView({
          slotId: 'WorkspaceGroup001',
          model: model.workspaceGroup001,
        }),
      ),
      h.block(
        WorkspaceGroup002Binding.embedView({
          slotId: 'WorkspaceGroup002',
          model: model.workspaceGroup002,
        }),
      ),
      h.block(
        WorkspaceGroup003Binding.embedView({
          slotId: 'WorkspaceGroup003',
          model: model.workspaceGroup003,
        }),
      ),
      h.block(
        WorkspaceGroup004Binding.embedView({
          slotId: 'WorkspaceGroup004',
          model: model.workspaceGroup004,
        }),
      ),
      h.block(
        WorkspaceGroup005Binding.embedView({
          slotId: 'WorkspaceGroup005',
          model: model.workspaceGroup005,
        }),
      ),
      h.block(
        WorkspaceGroup006Binding.embedView({
          slotId: 'WorkspaceGroup006',
          model: model.workspaceGroup006,
        }),
      ),
      h.block(
        WorkspaceGroup007Binding.embedView({
          slotId: 'WorkspaceGroup007',
          model: model.workspaceGroup007,
        }),
      ),
      h.block(
        WorkspaceGroup008Binding.embedView({
          slotId: 'WorkspaceGroup008',
          model: model.workspaceGroup008,
        }),
      ),
    ],
  )
const update = ApplicationComposition.makeUpdate({})
const init = ApplicationComposition.makeInit(() => ({
  model: { maybeLastSavedIssueId: Option.none() },
}))
const view = ApplicationComposition.makeView(workspaceContentView)
const prepare = () =>
  ApplicationComposition.prepareBlock({ init, update, view })
export interface ApplicationBlock extends Block.FromAssemblyWithView<
  typeof ApplicationModel,
  typeof prepare
> {}
export const ApplicationBlock: ApplicationBlock = Block.assemble(prepare)
export const program = Program.makeElement({
  block: ApplicationBlock,
  container: null,
})
export const providedProgram = program.provide(WorkspaceStoreLayer)

type RequirementsOf<Value> =
  Value extends ElementProgram<
    undefined,
    infer Requirements,
    never,
    infer _ProvidedServices
  >
    ? Requirements
    : never

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type Assertions = [
  Expect<Equal<RequirementsOf<typeof program>, WorkspaceStore>>,
  Expect<Equal<RequirementsOf<typeof providedProgram>, never>>,
  Expect<
    Equal<Layer.Services<typeof ApplicationBlock.EffectsLayer>, WorkspaceStore>
  >,
  Expect<Equal<Layer.Error<typeof ApplicationBlock.EffectsLayer>, never>>,
  Expect<Equal<typeof ApplicationBlock.Model, typeof ApplicationModel>>,
]

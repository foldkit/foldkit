import { Array, Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type * as Mount from 'foldkit/mount'
import { modifyFields } from 'foldkit/struct'

import {
  ControlBlock,
  EditorBlock,
  WorkspaceStore,
} from './workspace-shared.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

const WorkspaceGroup001EditorInstance = Schema.Struct({
  issueId: Schema.String,
  model: EditorBlock.Model,
})
const WorkspaceGroup001Row = Schema.Struct({
  issueId: Schema.String,
  model: EditorBlock.Model,
  label: Schema.String,
})
const WorkspaceGroup001Model = Schema.Struct({
  groupId: Schema.Literals(['WorkspaceGroup001']),
  control: ControlBlock.Model,
  maybeEditor: Schema.Option(WorkspaceGroup001EditorInstance),
  rows: Schema.Array(WorkspaceGroup001Row),
  lastSavedTitle: Schema.String,
})
const WorkspaceGroup001Message = defineMessageUnion({
  RequestedOpenEditor: { issueId: Schema.String },
  RequestedSaveEditor: {},
  CompletedPersistGroup: {},
  CompletedObserveGroup: {},
})
const WorkspaceGroup001OutMessage = defineMessageUnion({
  SavedIssue: {
    groupId: Schema.Literals(['WorkspaceGroup001']),
    issueId: Schema.String,
    title: Schema.String,
  },
})
const TypePerformanceWorkspaceGroup001Definition = Block.makeDefinition(
  'TypePerformanceWorkspaceGroup001',
  {
    Model: WorkspaceGroup001Model,
    Message: WorkspaceGroup001Message,
    OutMessage: WorkspaceGroup001OutMessage,
  },
)
const WorkspaceGroup001PersistGroup =
  TypePerformanceWorkspaceGroup001Definition.makeCommand('PersistGroup', {
    args: { issueId: Schema.String, title: Schema.String },
    messages: [WorkspaceGroup001Message.CompletedPersistGroup],
    handler: function* () {
      const store = yield* WorkspaceStore
      return input =>
        store
          .save(input)
          .pipe(Effect.as(WorkspaceGroup001Message.CompletedPersistGroup()))
    },
  })
const WorkspaceGroup001ObserveGroup =
  TypePerformanceWorkspaceGroup001Definition.makeMount('ObserveGroup', {
    messages: [WorkspaceGroup001Message.CompletedObserveGroup],
    handler: function* () {
      const store = yield* WorkspaceStore
      return ({ element }) =>
        store
          .observe(element)
          .pipe(Effect.as(WorkspaceGroup001Message.CompletedObserveGroup()))
    },
  })
const WorkspaceGroup001ControlBinding =
  TypePerformanceWorkspaceGroup001Definition.makeBinding(ControlBlock, {
    field: 'control',
  })
const WorkspaceGroup001EditorBinding =
  TypePerformanceWorkspaceGroup001Definition.makeBinding(EditorBlock, {
    field: 'maybeEditor',
    key: 'issueId',
    childField: 'model',
    placement: 'editor',
  })
const WorkspaceGroup001RowsBinding =
  TypePerformanceWorkspaceGroup001Definition.makeBinding(EditorBlock, {
    field: 'rows',
    key: 'issueId',
    childField: 'model',
    placement: 'rows',
    init: {
      instances: () => [
        { key: 'WorkspaceGroup001-row', args: ['WorkspaceGroup001-row'] },
      ],
      toItem: ({ key }, model) =>
        WorkspaceGroup001Row.make({ issueId: key, model, label: 'Issue row' }),
    },
  })
const WorkspaceGroup001OpenEditor = (issueId: string) =>
  TypePerformanceWorkspaceGroup001Definition.makeStep(model =>
    WorkspaceGroup001EditorBinding.init({
      key: issueId,
      args: [issueId],
      toParentModel: nextEditor =>
        modifyFields(model, {
          maybeEditor: () =>
            Option.some(
              WorkspaceGroup001EditorInstance.make({
                issueId,
                model: nextEditor,
              }),
            ),
        }),
    }),
  )
const WorkspaceGroup001FoldEditorOutMessage =
  TypePerformanceWorkspaceGroup001Definition.makeOutMessageFold(EditorBlock, {
    Saved: ({ issueId, title }) =>
      TypePerformanceWorkspaceGroup001Definition.makeStep(model => ({
        model: modifyFields(model, { lastSavedTitle: () => title }),
        commands: [WorkspaceGroup001PersistGroup({ issueId, title })],
        outMessage: WorkspaceGroup001OutMessage.SavedIssue({
          groupId: 'WorkspaceGroup001',
          issueId,
          title,
        }),
      })),
  })
const TypePerformanceWorkspaceGroup001Composition =
  TypePerformanceWorkspaceGroup001Definition.makeComposition({
    bindings: [
      WorkspaceGroup001ControlBinding.withOutMessagePolicy({
        fold: TypePerformanceWorkspaceGroup001Definition.makeOutMessageFold(
          ControlBlock,
          {
            SelectedIssue: ({ issueId }) =>
              WorkspaceGroup001OpenEditor(issueId),
            RequestedSaveIssue: ({ issueId }) =>
              WorkspaceGroup001EditorBinding.requestSave(issueId),
          },
        ),
      }),
      WorkspaceGroup001EditorBinding.withOutMessagePolicy({
        fold: (_issueId, outMessage) =>
          WorkspaceGroup001FoldEditorOutMessage(outMessage),
      }),
      WorkspaceGroup001RowsBinding.withOutMessagePolicy({
        fold: (_issueId, outMessage) =>
          WorkspaceGroup001FoldEditorOutMessage(outMessage),
      }),
    ],
    mounts: [WorkspaceGroup001ObserveGroup],
  })
type TypePerformanceWorkspaceGroup001ViewBuilder = Block.ViewBuilderFor<
  typeof TypePerformanceWorkspaceGroup001Composition
>
const WorkspaceGroup001ContentView = (
  model: typeof WorkspaceGroup001Model.Type,
  h: TypePerformanceWorkspaceGroup001ViewBuilder,
) =>
  h.section(
    [h.OnMount(WorkspaceGroup001ObserveGroup())],
    [
      h.block(
        WorkspaceGroup001ControlBinding.embedView({
          slotId: 'control',
          model: model.control,
        }),
      ),
      Option.match(model.maybeEditor, {
        onNone: () => h.empty,
        onSome: ({ issueId, model }) =>
          h.block(
            WorkspaceGroup001EditorBinding.embedView({
              key: issueId,
              slotId: issueId,
              model,
            }),
          ),
      }),
      ...Array.map(model.rows, ({ issueId, model }) =>
        h.block(
          WorkspaceGroup001RowsBinding.embedView({
            key: issueId,
            slotId: issueId,
            model,
          }),
        ),
      ),
    ],
  )
const WorkspaceGroup001View =
  TypePerformanceWorkspaceGroup001Composition.makeView((model, h) =>
    WorkspaceGroup001ContentView(model, h),
  )
const WorkspaceGroup001Noop =
  TypePerformanceWorkspaceGroup001Definition.makeNoopStep()
const WorkspaceGroup001Update =
  TypePerformanceWorkspaceGroup001Composition.makeUpdate({
    RequestedOpenEditor: (model, { issueId }) =>
      WorkspaceGroup001OpenEditor(issueId)(model),
    RequestedSaveEditor: model =>
      Option.match(model.maybeEditor, {
        onNone: () => WorkspaceGroup001Noop(model),
        onSome: ({ issueId }) =>
          WorkspaceGroup001EditorBinding.requestSave(issueId)(model),
      }),
    CompletedPersistGroup: model => WorkspaceGroup001Noop(model),
    CompletedObserveGroup: model => WorkspaceGroup001Noop(model),
  })
const WorkspaceGroup001Init =
  TypePerformanceWorkspaceGroup001Composition.makeInit(() => ({
    model: {
      groupId: 'WorkspaceGroup001',
      maybeEditor: Option.none(),
      lastSavedTitle: '',
    },
  }))
const WorkspaceGroup001EffectsLayer = Layer.merge(
  WorkspaceGroup001PersistGroup.layer,
  WorkspaceGroup001ObserveGroup.layer,
)
type WorkspaceGroup001MountProviderIsExact = Expect<
  Equal<
    Exclude<
      Mount.RequirementsOf<typeof WorkspaceGroup001ObserveGroup>,
      Layer.Success<typeof WorkspaceGroup001EffectsLayer>
    >,
    never
  >
>
const prepareWorkspaceGroup001 = () =>
  TypePerformanceWorkspaceGroup001Composition.prepareBlock({
    init: WorkspaceGroup001Init,
    update: WorkspaceGroup001Update,
    view: WorkspaceGroup001View,
    operations: {
      openEditor: WorkspaceGroup001Message.RequestedOpenEditor,
      requestSave: WorkspaceGroup001Message.RequestedSaveEditor,
    },
    EffectsLayer: WorkspaceGroup001EffectsLayer,
  })
export interface WorkspaceGroup001Block extends Block.FromAssemblyWithViewAndOutMessage<
  typeof WorkspaceGroup001Model,
  typeof prepareWorkspaceGroup001
> {}
export const WorkspaceGroup001Block: WorkspaceGroup001Block = Block.assemble(
  prepareWorkspaceGroup001,
)
export type WorkspaceGroup001Assertions = [
  WorkspaceGroup001MountProviderIsExact,
  Expect<
    Equal<typeof WorkspaceGroup001Block.Model, typeof WorkspaceGroup001Model>
  >,
  Expect<
    Equal<
      typeof WorkspaceGroup001Block.Model.Type,
      typeof WorkspaceGroup001Model.Type
    >
  >,
  Expect<
    Equal<
      typeof WorkspaceGroup001Block.Model.Encoded,
      typeof WorkspaceGroup001Model.Encoded
    >
  >,
  Expect<Equal<typeof WorkspaceGroup001Block.Model.DecodingServices, never>>,
  Expect<Equal<typeof WorkspaceGroup001Block.Model.EncodingServices, never>>,
  Expect<
    Equal<
      typeof WorkspaceGroup001Block.OutMessage.Type,
      typeof WorkspaceGroup001OutMessage.Type
    >
  >,
  Expect<
    Equal<
      typeof WorkspaceGroup001Block.OutMessage.Encoded,
      typeof WorkspaceGroup001OutMessage.Encoded
    >
  >,
  Expect<
    Equal<
      Layer.Services<typeof WorkspaceGroup001Block.EffectsLayer>,
      WorkspaceStore
    >
  >,
  Expect<Equal<Layer.Error<typeof WorkspaceGroup001Block.EffectsLayer>, never>>,
  Expect<
    Equal<
      Extract<
        Block.ViewMountRequirementsOf<typeof WorkspaceGroup001View>,
        Mount.RequirementsOf<typeof WorkspaceGroup001ObserveGroup>
      >,
      Mount.RequirementsOf<typeof WorkspaceGroup001ObserveGroup>
    >
  >,
]

const WorkspaceGroup002EditorInstance = Schema.Struct({
  issueId: Schema.String,
  model: EditorBlock.Model,
})
const WorkspaceGroup002Row = Schema.Struct({
  issueId: Schema.String,
  model: EditorBlock.Model,
  label: Schema.String,
})
const WorkspaceGroup002Model = Schema.Struct({
  groupId: Schema.Literals(['WorkspaceGroup002']),
  control: ControlBlock.Model,
  maybeEditor: Schema.Option(WorkspaceGroup002EditorInstance),
  rows: Schema.Array(WorkspaceGroup002Row),
  lastSavedTitle: Schema.String,
})
const WorkspaceGroup002Message = defineMessageUnion({
  RequestedOpenEditor: { issueId: Schema.String },
  RequestedSaveEditor: {},
  CompletedPersistGroup: {},
  CompletedObserveGroup: {},
})
const WorkspaceGroup002OutMessage = defineMessageUnion({
  SavedIssue: {
    groupId: Schema.Literals(['WorkspaceGroup002']),
    issueId: Schema.String,
    title: Schema.String,
  },
})
const TypePerformanceWorkspaceGroup002Definition = Block.makeDefinition(
  'TypePerformanceWorkspaceGroup002',
  {
    Model: WorkspaceGroup002Model,
    Message: WorkspaceGroup002Message,
    OutMessage: WorkspaceGroup002OutMessage,
  },
)
const WorkspaceGroup002PersistGroup =
  TypePerformanceWorkspaceGroup002Definition.makeCommand('PersistGroup', {
    args: { issueId: Schema.String, title: Schema.String },
    messages: [WorkspaceGroup002Message.CompletedPersistGroup],
    handler: function* () {
      const store = yield* WorkspaceStore
      return input =>
        store
          .save(input)
          .pipe(Effect.as(WorkspaceGroup002Message.CompletedPersistGroup()))
    },
  })
const WorkspaceGroup002ObserveGroup =
  TypePerformanceWorkspaceGroup002Definition.makeMount('ObserveGroup', {
    messages: [WorkspaceGroup002Message.CompletedObserveGroup],
    handler: function* () {
      const store = yield* WorkspaceStore
      return ({ element }) =>
        store
          .observe(element)
          .pipe(Effect.as(WorkspaceGroup002Message.CompletedObserveGroup()))
    },
  })
const WorkspaceGroup002ControlBinding =
  TypePerformanceWorkspaceGroup002Definition.makeBinding(ControlBlock, {
    field: 'control',
  })
const WorkspaceGroup002EditorBinding =
  TypePerformanceWorkspaceGroup002Definition.makeBinding(EditorBlock, {
    field: 'maybeEditor',
    key: 'issueId',
    childField: 'model',
    placement: 'editor',
  })
const WorkspaceGroup002RowsBinding =
  TypePerformanceWorkspaceGroup002Definition.makeBinding(EditorBlock, {
    field: 'rows',
    key: 'issueId',
    childField: 'model',
    placement: 'rows',
    init: {
      instances: () => [
        { key: 'WorkspaceGroup002-row', args: ['WorkspaceGroup002-row'] },
      ],
      toItem: ({ key }, model) =>
        WorkspaceGroup002Row.make({ issueId: key, model, label: 'Issue row' }),
    },
  })
const WorkspaceGroup002OpenEditor = (issueId: string) =>
  TypePerformanceWorkspaceGroup002Definition.makeStep(model =>
    WorkspaceGroup002EditorBinding.init({
      key: issueId,
      args: [issueId],
      toParentModel: nextEditor =>
        modifyFields(model, {
          maybeEditor: () =>
            Option.some(
              WorkspaceGroup002EditorInstance.make({
                issueId,
                model: nextEditor,
              }),
            ),
        }),
    }),
  )
const WorkspaceGroup002FoldEditorOutMessage =
  TypePerformanceWorkspaceGroup002Definition.makeOutMessageFold(EditorBlock, {
    Saved: ({ issueId, title }) =>
      TypePerformanceWorkspaceGroup002Definition.makeStep(model => ({
        model: modifyFields(model, { lastSavedTitle: () => title }),
        commands: [WorkspaceGroup002PersistGroup({ issueId, title })],
        outMessage: WorkspaceGroup002OutMessage.SavedIssue({
          groupId: 'WorkspaceGroup002',
          issueId,
          title,
        }),
      })),
  })
const TypePerformanceWorkspaceGroup002Composition =
  TypePerformanceWorkspaceGroup002Definition.makeComposition({
    bindings: [
      WorkspaceGroup002ControlBinding.withOutMessagePolicy({
        fold: TypePerformanceWorkspaceGroup002Definition.makeOutMessageFold(
          ControlBlock,
          {
            SelectedIssue: ({ issueId }) =>
              WorkspaceGroup002OpenEditor(issueId),
            RequestedSaveIssue: ({ issueId }) =>
              WorkspaceGroup002EditorBinding.requestSave(issueId),
          },
        ),
      }),
      WorkspaceGroup002EditorBinding.withOutMessagePolicy({
        fold: (_issueId, outMessage) =>
          WorkspaceGroup002FoldEditorOutMessage(outMessage),
      }),
      WorkspaceGroup002RowsBinding.withOutMessagePolicy({
        fold: (_issueId, outMessage) =>
          WorkspaceGroup002FoldEditorOutMessage(outMessage),
      }),
    ],
    mounts: [WorkspaceGroup002ObserveGroup],
  })
type TypePerformanceWorkspaceGroup002ViewBuilder = Block.ViewBuilderFor<
  typeof TypePerformanceWorkspaceGroup002Composition
>
const WorkspaceGroup002ContentView = (
  model: typeof WorkspaceGroup002Model.Type,
  h: TypePerformanceWorkspaceGroup002ViewBuilder,
) =>
  h.section(
    [h.OnMount(WorkspaceGroup002ObserveGroup())],
    [
      h.block(
        WorkspaceGroup002ControlBinding.embedView({
          slotId: 'control',
          model: model.control,
        }),
      ),
      Option.match(model.maybeEditor, {
        onNone: () => h.empty,
        onSome: ({ issueId, model }) =>
          h.block(
            WorkspaceGroup002EditorBinding.embedView({
              key: issueId,
              slotId: issueId,
              model,
            }),
          ),
      }),
      ...Array.map(model.rows, ({ issueId, model }) =>
        h.block(
          WorkspaceGroup002RowsBinding.embedView({
            key: issueId,
            slotId: issueId,
            model,
          }),
        ),
      ),
    ],
  )
const WorkspaceGroup002View =
  TypePerformanceWorkspaceGroup002Composition.makeView((model, h) =>
    WorkspaceGroup002ContentView(model, h),
  )
const WorkspaceGroup002Noop =
  TypePerformanceWorkspaceGroup002Definition.makeNoopStep()
const WorkspaceGroup002Update =
  TypePerformanceWorkspaceGroup002Composition.makeUpdate({
    RequestedOpenEditor: (model, { issueId }) =>
      WorkspaceGroup002OpenEditor(issueId)(model),
    RequestedSaveEditor: model =>
      Option.match(model.maybeEditor, {
        onNone: () => WorkspaceGroup002Noop(model),
        onSome: ({ issueId }) =>
          WorkspaceGroup002EditorBinding.requestSave(issueId)(model),
      }),
    CompletedPersistGroup: model => WorkspaceGroup002Noop(model),
    CompletedObserveGroup: model => WorkspaceGroup002Noop(model),
  })
const WorkspaceGroup002Init =
  TypePerformanceWorkspaceGroup002Composition.makeInit(() => ({
    model: {
      groupId: 'WorkspaceGroup002',
      maybeEditor: Option.none(),
      lastSavedTitle: '',
    },
  }))
const WorkspaceGroup002EffectsLayer = Layer.merge(
  WorkspaceGroup002PersistGroup.layer,
  WorkspaceGroup002ObserveGroup.layer,
)
type WorkspaceGroup002MountProviderIsExact = Expect<
  Equal<
    Exclude<
      Mount.RequirementsOf<typeof WorkspaceGroup002ObserveGroup>,
      Layer.Success<typeof WorkspaceGroup002EffectsLayer>
    >,
    never
  >
>
const prepareWorkspaceGroup002 = () =>
  TypePerformanceWorkspaceGroup002Composition.prepareBlock({
    init: WorkspaceGroup002Init,
    update: WorkspaceGroup002Update,
    view: WorkspaceGroup002View,
    operations: {
      openEditor: WorkspaceGroup002Message.RequestedOpenEditor,
      requestSave: WorkspaceGroup002Message.RequestedSaveEditor,
    },
    EffectsLayer: WorkspaceGroup002EffectsLayer,
  })
export interface WorkspaceGroup002Block extends Block.FromAssemblyWithViewAndOutMessage<
  typeof WorkspaceGroup002Model,
  typeof prepareWorkspaceGroup002
> {}
export const WorkspaceGroup002Block: WorkspaceGroup002Block = Block.assemble(
  prepareWorkspaceGroup002,
)
export type WorkspaceGroup002Assertions = [
  WorkspaceGroup002MountProviderIsExact,
  Expect<
    Equal<typeof WorkspaceGroup002Block.Model, typeof WorkspaceGroup002Model>
  >,
  Expect<
    Equal<
      typeof WorkspaceGroup002Block.Model.Type,
      typeof WorkspaceGroup002Model.Type
    >
  >,
  Expect<
    Equal<
      typeof WorkspaceGroup002Block.Model.Encoded,
      typeof WorkspaceGroup002Model.Encoded
    >
  >,
  Expect<Equal<typeof WorkspaceGroup002Block.Model.DecodingServices, never>>,
  Expect<Equal<typeof WorkspaceGroup002Block.Model.EncodingServices, never>>,
  Expect<
    Equal<
      typeof WorkspaceGroup002Block.OutMessage.Type,
      typeof WorkspaceGroup002OutMessage.Type
    >
  >,
  Expect<
    Equal<
      typeof WorkspaceGroup002Block.OutMessage.Encoded,
      typeof WorkspaceGroup002OutMessage.Encoded
    >
  >,
  Expect<
    Equal<
      Layer.Services<typeof WorkspaceGroup002Block.EffectsLayer>,
      WorkspaceStore
    >
  >,
  Expect<Equal<Layer.Error<typeof WorkspaceGroup002Block.EffectsLayer>, never>>,
  Expect<
    Equal<
      Extract<
        Block.ViewMountRequirementsOf<typeof WorkspaceGroup002View>,
        Mount.RequirementsOf<typeof WorkspaceGroup002ObserveGroup>
      >,
      Mount.RequirementsOf<typeof WorkspaceGroup002ObserveGroup>
    >
  >,
]

const WorkspaceGroup003EditorInstance = Schema.Struct({
  issueId: Schema.String,
  model: EditorBlock.Model,
})
const WorkspaceGroup003Row = Schema.Struct({
  issueId: Schema.String,
  model: EditorBlock.Model,
  label: Schema.String,
})
const WorkspaceGroup003Model = Schema.Struct({
  groupId: Schema.Literals(['WorkspaceGroup003']),
  control: ControlBlock.Model,
  maybeEditor: Schema.Option(WorkspaceGroup003EditorInstance),
  rows: Schema.Array(WorkspaceGroup003Row),
  lastSavedTitle: Schema.String,
})
const WorkspaceGroup003Message = defineMessageUnion({
  RequestedOpenEditor: { issueId: Schema.String },
  RequestedSaveEditor: {},
  CompletedPersistGroup: {},
  CompletedObserveGroup: {},
})
const WorkspaceGroup003OutMessage = defineMessageUnion({
  SavedIssue: {
    groupId: Schema.Literals(['WorkspaceGroup003']),
    issueId: Schema.String,
    title: Schema.String,
  },
})
const TypePerformanceWorkspaceGroup003Definition = Block.makeDefinition(
  'TypePerformanceWorkspaceGroup003',
  {
    Model: WorkspaceGroup003Model,
    Message: WorkspaceGroup003Message,
    OutMessage: WorkspaceGroup003OutMessage,
  },
)
const WorkspaceGroup003PersistGroup =
  TypePerformanceWorkspaceGroup003Definition.makeCommand('PersistGroup', {
    args: { issueId: Schema.String, title: Schema.String },
    messages: [WorkspaceGroup003Message.CompletedPersistGroup],
    handler: function* () {
      const store = yield* WorkspaceStore
      return input =>
        store
          .save(input)
          .pipe(Effect.as(WorkspaceGroup003Message.CompletedPersistGroup()))
    },
  })
const WorkspaceGroup003ObserveGroup =
  TypePerformanceWorkspaceGroup003Definition.makeMount('ObserveGroup', {
    messages: [WorkspaceGroup003Message.CompletedObserveGroup],
    handler: function* () {
      const store = yield* WorkspaceStore
      return ({ element }) =>
        store
          .observe(element)
          .pipe(Effect.as(WorkspaceGroup003Message.CompletedObserveGroup()))
    },
  })
const WorkspaceGroup003ControlBinding =
  TypePerformanceWorkspaceGroup003Definition.makeBinding(ControlBlock, {
    field: 'control',
  })
const WorkspaceGroup003EditorBinding =
  TypePerformanceWorkspaceGroup003Definition.makeBinding(EditorBlock, {
    field: 'maybeEditor',
    key: 'issueId',
    childField: 'model',
    placement: 'editor',
  })
const WorkspaceGroup003RowsBinding =
  TypePerformanceWorkspaceGroup003Definition.makeBinding(EditorBlock, {
    field: 'rows',
    key: 'issueId',
    childField: 'model',
    placement: 'rows',
    init: {
      instances: () => [
        { key: 'WorkspaceGroup003-row', args: ['WorkspaceGroup003-row'] },
      ],
      toItem: ({ key }, model) =>
        WorkspaceGroup003Row.make({ issueId: key, model, label: 'Issue row' }),
    },
  })
const WorkspaceGroup003OpenEditor = (issueId: string) =>
  TypePerformanceWorkspaceGroup003Definition.makeStep(model =>
    WorkspaceGroup003EditorBinding.init({
      key: issueId,
      args: [issueId],
      toParentModel: nextEditor =>
        modifyFields(model, {
          maybeEditor: () =>
            Option.some(
              WorkspaceGroup003EditorInstance.make({
                issueId,
                model: nextEditor,
              }),
            ),
        }),
    }),
  )
const WorkspaceGroup003FoldEditorOutMessage =
  TypePerformanceWorkspaceGroup003Definition.makeOutMessageFold(EditorBlock, {
    Saved: ({ issueId, title }) =>
      TypePerformanceWorkspaceGroup003Definition.makeStep(model => ({
        model: modifyFields(model, { lastSavedTitle: () => title }),
        commands: [WorkspaceGroup003PersistGroup({ issueId, title })],
        outMessage: WorkspaceGroup003OutMessage.SavedIssue({
          groupId: 'WorkspaceGroup003',
          issueId,
          title,
        }),
      })),
  })
const TypePerformanceWorkspaceGroup003Composition =
  TypePerformanceWorkspaceGroup003Definition.makeComposition({
    bindings: [
      WorkspaceGroup003ControlBinding.withOutMessagePolicy({
        fold: TypePerformanceWorkspaceGroup003Definition.makeOutMessageFold(
          ControlBlock,
          {
            SelectedIssue: ({ issueId }) =>
              WorkspaceGroup003OpenEditor(issueId),
            RequestedSaveIssue: ({ issueId }) =>
              WorkspaceGroup003EditorBinding.requestSave(issueId),
          },
        ),
      }),
      WorkspaceGroup003EditorBinding.withOutMessagePolicy({
        fold: (_issueId, outMessage) =>
          WorkspaceGroup003FoldEditorOutMessage(outMessage),
      }),
      WorkspaceGroup003RowsBinding.withOutMessagePolicy({
        fold: (_issueId, outMessage) =>
          WorkspaceGroup003FoldEditorOutMessage(outMessage),
      }),
    ],
    mounts: [WorkspaceGroup003ObserveGroup],
  })
type TypePerformanceWorkspaceGroup003ViewBuilder = Block.ViewBuilderFor<
  typeof TypePerformanceWorkspaceGroup003Composition
>
const WorkspaceGroup003ContentView = (
  model: typeof WorkspaceGroup003Model.Type,
  h: TypePerformanceWorkspaceGroup003ViewBuilder,
) =>
  h.section(
    [h.OnMount(WorkspaceGroup003ObserveGroup())],
    [
      h.block(
        WorkspaceGroup003ControlBinding.embedView({
          slotId: 'control',
          model: model.control,
        }),
      ),
      Option.match(model.maybeEditor, {
        onNone: () => h.empty,
        onSome: ({ issueId, model }) =>
          h.block(
            WorkspaceGroup003EditorBinding.embedView({
              key: issueId,
              slotId: issueId,
              model,
            }),
          ),
      }),
      ...Array.map(model.rows, ({ issueId, model }) =>
        h.block(
          WorkspaceGroup003RowsBinding.embedView({
            key: issueId,
            slotId: issueId,
            model,
          }),
        ),
      ),
    ],
  )
const WorkspaceGroup003View =
  TypePerformanceWorkspaceGroup003Composition.makeView((model, h) =>
    WorkspaceGroup003ContentView(model, h),
  )
const WorkspaceGroup003Noop =
  TypePerformanceWorkspaceGroup003Definition.makeNoopStep()
const WorkspaceGroup003Update =
  TypePerformanceWorkspaceGroup003Composition.makeUpdate({
    RequestedOpenEditor: (model, { issueId }) =>
      WorkspaceGroup003OpenEditor(issueId)(model),
    RequestedSaveEditor: model =>
      Option.match(model.maybeEditor, {
        onNone: () => WorkspaceGroup003Noop(model),
        onSome: ({ issueId }) =>
          WorkspaceGroup003EditorBinding.requestSave(issueId)(model),
      }),
    CompletedPersistGroup: model => WorkspaceGroup003Noop(model),
    CompletedObserveGroup: model => WorkspaceGroup003Noop(model),
  })
const WorkspaceGroup003Init =
  TypePerformanceWorkspaceGroup003Composition.makeInit(() => ({
    model: {
      groupId: 'WorkspaceGroup003',
      maybeEditor: Option.none(),
      lastSavedTitle: '',
    },
  }))
const WorkspaceGroup003EffectsLayer = Layer.merge(
  WorkspaceGroup003PersistGroup.layer,
  WorkspaceGroup003ObserveGroup.layer,
)
type WorkspaceGroup003MountProviderIsExact = Expect<
  Equal<
    Exclude<
      Mount.RequirementsOf<typeof WorkspaceGroup003ObserveGroup>,
      Layer.Success<typeof WorkspaceGroup003EffectsLayer>
    >,
    never
  >
>
const prepareWorkspaceGroup003 = () =>
  TypePerformanceWorkspaceGroup003Composition.prepareBlock({
    init: WorkspaceGroup003Init,
    update: WorkspaceGroup003Update,
    view: WorkspaceGroup003View,
    operations: {
      openEditor: WorkspaceGroup003Message.RequestedOpenEditor,
      requestSave: WorkspaceGroup003Message.RequestedSaveEditor,
    },
    EffectsLayer: WorkspaceGroup003EffectsLayer,
  })
export interface WorkspaceGroup003Block extends Block.FromAssemblyWithViewAndOutMessage<
  typeof WorkspaceGroup003Model,
  typeof prepareWorkspaceGroup003
> {}
export const WorkspaceGroup003Block: WorkspaceGroup003Block = Block.assemble(
  prepareWorkspaceGroup003,
)
export type WorkspaceGroup003Assertions = [
  WorkspaceGroup003MountProviderIsExact,
  Expect<
    Equal<typeof WorkspaceGroup003Block.Model, typeof WorkspaceGroup003Model>
  >,
  Expect<
    Equal<
      typeof WorkspaceGroup003Block.Model.Type,
      typeof WorkspaceGroup003Model.Type
    >
  >,
  Expect<
    Equal<
      typeof WorkspaceGroup003Block.Model.Encoded,
      typeof WorkspaceGroup003Model.Encoded
    >
  >,
  Expect<Equal<typeof WorkspaceGroup003Block.Model.DecodingServices, never>>,
  Expect<Equal<typeof WorkspaceGroup003Block.Model.EncodingServices, never>>,
  Expect<
    Equal<
      typeof WorkspaceGroup003Block.OutMessage.Type,
      typeof WorkspaceGroup003OutMessage.Type
    >
  >,
  Expect<
    Equal<
      typeof WorkspaceGroup003Block.OutMessage.Encoded,
      typeof WorkspaceGroup003OutMessage.Encoded
    >
  >,
  Expect<
    Equal<
      Layer.Services<typeof WorkspaceGroup003Block.EffectsLayer>,
      WorkspaceStore
    >
  >,
  Expect<Equal<Layer.Error<typeof WorkspaceGroup003Block.EffectsLayer>, never>>,
  Expect<
    Equal<
      Extract<
        Block.ViewMountRequirementsOf<typeof WorkspaceGroup003View>,
        Mount.RequirementsOf<typeof WorkspaceGroup003ObserveGroup>
      >,
      Mount.RequirementsOf<typeof WorkspaceGroup003ObserveGroup>
    >
  >,
]

const WorkspaceGroup004EditorInstance = Schema.Struct({
  issueId: Schema.String,
  model: EditorBlock.Model,
})
const WorkspaceGroup004Row = Schema.Struct({
  issueId: Schema.String,
  model: EditorBlock.Model,
  label: Schema.String,
})
const WorkspaceGroup004Model = Schema.Struct({
  groupId: Schema.Literals(['WorkspaceGroup004']),
  control: ControlBlock.Model,
  maybeEditor: Schema.Option(WorkspaceGroup004EditorInstance),
  rows: Schema.Array(WorkspaceGroup004Row),
  lastSavedTitle: Schema.String,
})
const WorkspaceGroup004Message = defineMessageUnion({
  RequestedOpenEditor: { issueId: Schema.String },
  RequestedSaveEditor: {},
  CompletedPersistGroup: {},
  CompletedObserveGroup: {},
})
const WorkspaceGroup004OutMessage = defineMessageUnion({
  SavedIssue: {
    groupId: Schema.Literals(['WorkspaceGroup004']),
    issueId: Schema.String,
    title: Schema.String,
  },
})
const TypePerformanceWorkspaceGroup004Definition = Block.makeDefinition(
  'TypePerformanceWorkspaceGroup004',
  {
    Model: WorkspaceGroup004Model,
    Message: WorkspaceGroup004Message,
    OutMessage: WorkspaceGroup004OutMessage,
  },
)
const WorkspaceGroup004PersistGroup =
  TypePerformanceWorkspaceGroup004Definition.makeCommand('PersistGroup', {
    args: { issueId: Schema.String, title: Schema.String },
    messages: [WorkspaceGroup004Message.CompletedPersistGroup],
    handler: function* () {
      const store = yield* WorkspaceStore
      return input =>
        store
          .save(input)
          .pipe(Effect.as(WorkspaceGroup004Message.CompletedPersistGroup()))
    },
  })
const WorkspaceGroup004ObserveGroup =
  TypePerformanceWorkspaceGroup004Definition.makeMount('ObserveGroup', {
    messages: [WorkspaceGroup004Message.CompletedObserveGroup],
    handler: function* () {
      const store = yield* WorkspaceStore
      return ({ element }) =>
        store
          .observe(element)
          .pipe(Effect.as(WorkspaceGroup004Message.CompletedObserveGroup()))
    },
  })
const WorkspaceGroup004ControlBinding =
  TypePerformanceWorkspaceGroup004Definition.makeBinding(ControlBlock, {
    field: 'control',
  })
const WorkspaceGroup004EditorBinding =
  TypePerformanceWorkspaceGroup004Definition.makeBinding(EditorBlock, {
    field: 'maybeEditor',
    key: 'issueId',
    childField: 'model',
    placement: 'editor',
  })
const WorkspaceGroup004RowsBinding =
  TypePerformanceWorkspaceGroup004Definition.makeBinding(EditorBlock, {
    field: 'rows',
    key: 'issueId',
    childField: 'model',
    placement: 'rows',
    init: {
      instances: () => [
        { key: 'WorkspaceGroup004-row', args: ['WorkspaceGroup004-row'] },
      ],
      toItem: ({ key }, model) =>
        WorkspaceGroup004Row.make({ issueId: key, model, label: 'Issue row' }),
    },
  })
const WorkspaceGroup004OpenEditor = (issueId: string) =>
  TypePerformanceWorkspaceGroup004Definition.makeStep(model =>
    WorkspaceGroup004EditorBinding.init({
      key: issueId,
      args: [issueId],
      toParentModel: nextEditor =>
        modifyFields(model, {
          maybeEditor: () =>
            Option.some(
              WorkspaceGroup004EditorInstance.make({
                issueId,
                model: nextEditor,
              }),
            ),
        }),
    }),
  )
const WorkspaceGroup004FoldEditorOutMessage =
  TypePerformanceWorkspaceGroup004Definition.makeOutMessageFold(EditorBlock, {
    Saved: ({ issueId, title }) =>
      TypePerformanceWorkspaceGroup004Definition.makeStep(model => ({
        model: modifyFields(model, { lastSavedTitle: () => title }),
        commands: [WorkspaceGroup004PersistGroup({ issueId, title })],
        outMessage: WorkspaceGroup004OutMessage.SavedIssue({
          groupId: 'WorkspaceGroup004',
          issueId,
          title,
        }),
      })),
  })
const TypePerformanceWorkspaceGroup004Composition =
  TypePerformanceWorkspaceGroup004Definition.makeComposition({
    bindings: [
      WorkspaceGroup004ControlBinding.withOutMessagePolicy({
        fold: TypePerformanceWorkspaceGroup004Definition.makeOutMessageFold(
          ControlBlock,
          {
            SelectedIssue: ({ issueId }) =>
              WorkspaceGroup004OpenEditor(issueId),
            RequestedSaveIssue: ({ issueId }) =>
              WorkspaceGroup004EditorBinding.requestSave(issueId),
          },
        ),
      }),
      WorkspaceGroup004EditorBinding.withOutMessagePolicy({
        fold: (_issueId, outMessage) =>
          WorkspaceGroup004FoldEditorOutMessage(outMessage),
      }),
      WorkspaceGroup004RowsBinding.withOutMessagePolicy({
        fold: (_issueId, outMessage) =>
          WorkspaceGroup004FoldEditorOutMessage(outMessage),
      }),
    ],
    mounts: [WorkspaceGroup004ObserveGroup],
  })
type TypePerformanceWorkspaceGroup004ViewBuilder = Block.ViewBuilderFor<
  typeof TypePerformanceWorkspaceGroup004Composition
>
const WorkspaceGroup004ContentView = (
  model: typeof WorkspaceGroup004Model.Type,
  h: TypePerformanceWorkspaceGroup004ViewBuilder,
) =>
  h.section(
    [h.OnMount(WorkspaceGroup004ObserveGroup())],
    [
      h.block(
        WorkspaceGroup004ControlBinding.embedView({
          slotId: 'control',
          model: model.control,
        }),
      ),
      Option.match(model.maybeEditor, {
        onNone: () => h.empty,
        onSome: ({ issueId, model }) =>
          h.block(
            WorkspaceGroup004EditorBinding.embedView({
              key: issueId,
              slotId: issueId,
              model,
            }),
          ),
      }),
      ...Array.map(model.rows, ({ issueId, model }) =>
        h.block(
          WorkspaceGroup004RowsBinding.embedView({
            key: issueId,
            slotId: issueId,
            model,
          }),
        ),
      ),
    ],
  )
const WorkspaceGroup004View =
  TypePerformanceWorkspaceGroup004Composition.makeView((model, h) =>
    WorkspaceGroup004ContentView(model, h),
  )
const WorkspaceGroup004Noop =
  TypePerformanceWorkspaceGroup004Definition.makeNoopStep()
const WorkspaceGroup004Update =
  TypePerformanceWorkspaceGroup004Composition.makeUpdate({
    RequestedOpenEditor: (model, { issueId }) =>
      WorkspaceGroup004OpenEditor(issueId)(model),
    RequestedSaveEditor: model =>
      Option.match(model.maybeEditor, {
        onNone: () => WorkspaceGroup004Noop(model),
        onSome: ({ issueId }) =>
          WorkspaceGroup004EditorBinding.requestSave(issueId)(model),
      }),
    CompletedPersistGroup: model => WorkspaceGroup004Noop(model),
    CompletedObserveGroup: model => WorkspaceGroup004Noop(model),
  })
const WorkspaceGroup004Init =
  TypePerformanceWorkspaceGroup004Composition.makeInit(() => ({
    model: {
      groupId: 'WorkspaceGroup004',
      maybeEditor: Option.none(),
      lastSavedTitle: '',
    },
  }))
const WorkspaceGroup004EffectsLayer = Layer.merge(
  WorkspaceGroup004PersistGroup.layer,
  WorkspaceGroup004ObserveGroup.layer,
)
type WorkspaceGroup004MountProviderIsExact = Expect<
  Equal<
    Exclude<
      Mount.RequirementsOf<typeof WorkspaceGroup004ObserveGroup>,
      Layer.Success<typeof WorkspaceGroup004EffectsLayer>
    >,
    never
  >
>
const prepareWorkspaceGroup004 = () =>
  TypePerformanceWorkspaceGroup004Composition.prepareBlock({
    init: WorkspaceGroup004Init,
    update: WorkspaceGroup004Update,
    view: WorkspaceGroup004View,
    operations: {
      openEditor: WorkspaceGroup004Message.RequestedOpenEditor,
      requestSave: WorkspaceGroup004Message.RequestedSaveEditor,
    },
    EffectsLayer: WorkspaceGroup004EffectsLayer,
  })
export interface WorkspaceGroup004Block extends Block.FromAssemblyWithViewAndOutMessage<
  typeof WorkspaceGroup004Model,
  typeof prepareWorkspaceGroup004
> {}
export const WorkspaceGroup004Block: WorkspaceGroup004Block = Block.assemble(
  prepareWorkspaceGroup004,
)
export type WorkspaceGroup004Assertions = [
  WorkspaceGroup004MountProviderIsExact,
  Expect<
    Equal<typeof WorkspaceGroup004Block.Model, typeof WorkspaceGroup004Model>
  >,
  Expect<
    Equal<
      typeof WorkspaceGroup004Block.Model.Type,
      typeof WorkspaceGroup004Model.Type
    >
  >,
  Expect<
    Equal<
      typeof WorkspaceGroup004Block.Model.Encoded,
      typeof WorkspaceGroup004Model.Encoded
    >
  >,
  Expect<Equal<typeof WorkspaceGroup004Block.Model.DecodingServices, never>>,
  Expect<Equal<typeof WorkspaceGroup004Block.Model.EncodingServices, never>>,
  Expect<
    Equal<
      typeof WorkspaceGroup004Block.OutMessage.Type,
      typeof WorkspaceGroup004OutMessage.Type
    >
  >,
  Expect<
    Equal<
      typeof WorkspaceGroup004Block.OutMessage.Encoded,
      typeof WorkspaceGroup004OutMessage.Encoded
    >
  >,
  Expect<
    Equal<
      Layer.Services<typeof WorkspaceGroup004Block.EffectsLayer>,
      WorkspaceStore
    >
  >,
  Expect<Equal<Layer.Error<typeof WorkspaceGroup004Block.EffectsLayer>, never>>,
  Expect<
    Equal<
      Extract<
        Block.ViewMountRequirementsOf<typeof WorkspaceGroup004View>,
        Mount.RequirementsOf<typeof WorkspaceGroup004ObserveGroup>
      >,
      Mount.RequirementsOf<typeof WorkspaceGroup004ObserveGroup>
    >
  >,
]

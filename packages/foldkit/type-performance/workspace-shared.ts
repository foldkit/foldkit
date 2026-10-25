import { Context, Effect, Layer, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const SaveInput = Schema.Struct({
  issueId: Schema.String,
  title: Schema.String,
})

export class WorkspaceStore extends Context.Service<
  WorkspaceStore,
  Readonly<{
    save: (input: typeof SaveInput.Type) => Effect.Effect<void>
    observe: (element: Element) => Effect.Effect<void>
  }>
>()('TypePerformanceWorkspaceStore') {}

export const WorkspaceStoreLayer = Layer.succeed(WorkspaceStore, {
  save: () => Effect.void,
  observe: element =>
    Effect.sync(() => {
      element.getBoundingClientRect()
    }),
})

const ControlModel = Schema.Struct({ query: Schema.String })
const ControlMessage = defineMessageUnion({
  UpdatedQuery: { value: Schema.String },
  ClickedIssue: { issueId: Schema.String },
  ClickedSaveIssue: { issueId: Schema.String },
  RequestedClearQuery: {},
})
const ControlOutMessage = defineMessageUnion({
  SelectedIssue: { issueId: Schema.String },
  RequestedSaveIssue: { issueId: Schema.String },
})
const TypePerformanceWorkspaceControlComposition = Block.makeDefinition(
  'TypePerformanceWorkspaceControl',
  {
    Model: ControlModel,
    Message: ControlMessage,
    OutMessage: ControlOutMessage,
  },
).makeComposition()
type ControlViewBuilder = Block.ViewBuilderFor<
  typeof TypePerformanceWorkspaceControlComposition
>

const controlContentView = (
  model: typeof ControlModel.Type,
  h: ControlViewBuilder,
) =>
  h.div(
    [],
    [
      h.input([
        h.Value(model.query),
        h.OnInput(value => ControlMessage.UpdatedQuery({ value })),
      ]),
      h.button(
        [h.OnClick(ControlMessage.ClickedSaveIssue({ issueId: model.query }))],
        ['Save selected issue'],
      ),
    ],
  )

const prepareControl = () =>
  TypePerformanceWorkspaceControlComposition.prepareBlock({
    init: TypePerformanceWorkspaceControlComposition.makeInit(() => ({
      model: ControlModel.make({ query: '' }),
    })),
    update: TypePerformanceWorkspaceControlComposition.makeUpdate({
      UpdatedQuery: (model, { value }) => ({
        model: modifyFields(model, { query: () => value }),
      }),
      ClickedIssue: (model, { issueId }) => ({
        model,
        outMessage: ControlOutMessage.SelectedIssue({ issueId }),
      }),
      ClickedSaveIssue: (model, { issueId }) => ({
        model,
        outMessage: ControlOutMessage.RequestedSaveIssue({ issueId }),
      }),
      RequestedClearQuery: model => ({
        model: modifyFields(model, { query: () => '' }),
      }),
    }),
    view: TypePerformanceWorkspaceControlComposition.makeView(
      controlContentView,
    ),
    operations: {
      selectIssue: ControlMessage.ClickedIssue,
      clearQuery: ControlMessage.RequestedClearQuery,
    },
  })
export interface ControlBlock extends Block.FromAssemblyWithViewAndOutMessage<
  typeof ControlModel,
  typeof prepareControl
> {}
export const ControlBlock: ControlBlock = Block.assemble(prepareControl)

const EditorModel = Schema.Struct({
  issueId: Schema.String,
  title: Schema.String,
  revision: Schema.Number,
})
const EditorMessage = defineMessageUnion({
  UpdatedTitle: { value: Schema.String },
  RequestedSave: {},
  CompletedSaveIssue: { issueId: Schema.String, title: Schema.String },
})
const EditorOutMessage = defineMessageUnion({
  Saved: { issueId: Schema.String, title: Schema.String },
})
const TypePerformanceWorkspaceEditorDefinition = Block.makeDefinition(
  'TypePerformanceWorkspaceEditor',
  { Model: EditorModel, Message: EditorMessage, OutMessage: EditorOutMessage },
)
const SaveIssue = TypePerformanceWorkspaceEditorDefinition.makeCommand(
  'SaveIssue',
  {
    args: SaveInput.fields,
    messages: [EditorMessage.CompletedSaveIssue],
    handler: function* () {
      const store = yield* WorkspaceStore
      return input =>
        store
          .save(input)
          .pipe(Effect.as(EditorMessage.CompletedSaveIssue(input)))
    },
  },
)
const TypePerformanceWorkspaceEditorComposition =
  TypePerformanceWorkspaceEditorDefinition.makeComposition()
type EditorViewBuilder = Block.ViewBuilderFor<
  typeof TypePerformanceWorkspaceEditorComposition
>

const editorContentView = (
  model: typeof EditorModel.Type,
  h: EditorViewBuilder,
) =>
  h.section(
    [],
    [
      h.input([
        h.Value(model.title),
        h.OnInput(value => EditorMessage.UpdatedTitle({ value })),
      ]),
      h.button([h.OnClick(EditorMessage.RequestedSave())], ['Save']),
    ],
  )

const prepareEditor = () =>
  TypePerformanceWorkspaceEditorComposition.prepareBlock({
    init: TypePerformanceWorkspaceEditorComposition.makeInit(
      (issueId: string) => ({
        model: EditorModel.make({ issueId, title: '', revision: 0 }),
      }),
    ),
    update: TypePerformanceWorkspaceEditorComposition.makeUpdate({
      UpdatedTitle: (model, { value }) => ({
        model: modifyFields(model, { title: () => value }),
      }),
      RequestedSave: model => ({
        model,
        commands: [SaveIssue({ issueId: model.issueId, title: model.title })],
      }),
      CompletedSaveIssue: (model, { issueId, title }) => ({
        model: modifyFields(model, { revision: Number.increment }),
        outMessage: EditorOutMessage.Saved({ issueId, title }),
      }),
    }),
    view: TypePerformanceWorkspaceEditorComposition.makeView(editorContentView),
    operations: { requestSave: EditorMessage.RequestedSave },
    EffectsLayer: SaveIssue.layer,
  })
export interface EditorBlock extends Block.FromAssemblyWithViewAndOutMessage<
  typeof EditorModel,
  typeof prepareEditor
> {}
export const EditorBlock: EditorBlock = Block.assemble(prepareEditor)

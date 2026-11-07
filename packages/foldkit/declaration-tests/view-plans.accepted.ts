import { Array, Effect, Record, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ count: Schema.Number })
export const Message = defineMessageUnion({ ClickedIncrement: {} })
export const ViewPlanKey = Symbol('ViewPlanFixture')
export const Definition = Block.makeDefinition('ViewPlanFixture', {
  key: ViewPlanKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{ heading: string }>(),
  },
})
export const Composition = Definition.makeComposition()
export const init = Composition.makeInit(() => ({ model: { count: 0 } }))
export const update = Composition.makeUpdate({
  ClickedIncrement: Definition.makeFieldsStep(() => ({
    count: count => count + 1,
  })),
})
export const counterView = Composition.makeView.withInputs<{ label: string }>(
  (model, { label }, h) =>
    h.button(
      [h.OnClick(Message.ClickedIncrement())],
      [`${label}: ${model.count}`],
    ),
)
export const view = Composition.makeView.withInputs((model, { heading }, h) =>
  h.div([], [counterView(model, { label: heading }, h)]),
)
export const ApplicationBlock = Definition.makeBlock(
  Effect.succeed({ children: [], init, update, view }),
)

const rejectWrongCompletion = () =>
  // @ts-expect-error A nested helper's inputs cannot replace the public view contract.
  Definition.makeBlock(
    Effect.succeed({ children: [], init, update, view: counterView }),
  )
void rejectWrongCompletion

export const ShellKey = Symbol('EmbeddedViewPlanFixture')
export const ShellDefinition = Block.makeDefinition('EmbeddedViewPlanFixture', {
  key: ShellKey,
  Model: Schema.Struct({ child: Definition.contract.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
export const ChildBinding = ShellDefinition.makeRequiredFieldBinding(
  Definition.contract,
  {
    field: 'child',
  },
)
export const ShellComposition = ShellDefinition.makeComposition({
  bindings: [ChildBinding],
})
export const canonicalViewInputs = (
  heading: string,
): Parameters<typeof ChildBinding.embedView>[0]['viewInputs'] => ({ heading })
export const canonicalViewConfig = (
  model: typeof Model.Type,
): Parameters<typeof ChildBinding.embedView>[0] => ({
  slotId: 'default-counter',
  model,
  viewInputs: canonicalViewInputs('Count'),
})
export const shellView = ShellComposition.makeView((model, h) =>
  h.block(
    ChildBinding.embedView({
      slotId: 'counter',
      model: model.child,
      view: counterView,
      viewInputs: { label: 'Count' },
    }),
  ),
)
export const ShellBlock = ShellDefinition.makeBlock(
  Effect.gen(function* () {
    const child = yield* ChildBinding

    return {
      children: [child],
      init: ShellComposition.makeInit(() => ({ model: {} })),
      update: ShellComposition.makeUpdate({}),
      view: shellView,
    }
  }),
).provide(ApplicationBlock.layer)

export const ForeignKey = Symbol('ForeignViewPlanFixture')
export const ForeignDefinition = Block.makeDefinition(
  'ForeignViewPlanFixture',
  {
    key: ForeignKey,
    Model,
    Message,
    InitArgs: Schema.Tuple([]),
  },
)
export const foreignView = ForeignDefinition.makeComposition().makeView(
  (_model, h) => h.div([]),
)

export const HeadlessKey = Symbol('HeadlessViewPlanFixture')
export const HeadlessDefinition = Block.makeDefinition(
  'HeadlessViewPlanFixture',
  {
    key: HeadlessKey,
    Model,
    Message,
    InitArgs: Schema.Tuple([]),
  },
)
export const HeadlessComposition = HeadlessDefinition.makeComposition()
export const headlessView = HeadlessComposition.makeView.withInputs<{
  label: string
}>((model, { label }, h) =>
  h.button(
    [h.OnClick(Message.ClickedIncrement())],
    [`${label}: ${model.count}`],
  ),
)
export const HeadlessParentKey = Symbol('HeadlessViewPlanParent')
export const HeadlessParentDefinition = Block.makeDefinition(
  'HeadlessViewPlanParent',
  {
    key: HeadlessParentKey,
    Model: Schema.Struct({ child: HeadlessDefinition.contract.Model }),
    Message: Schema.Never,
    InitArgs: Schema.Tuple([]),
  },
)
export const HeadlessBinding =
  HeadlessParentDefinition.makeRequiredFieldBinding(
    HeadlessDefinition.contract,
    { field: 'child' },
  )
export const HeadlessParentComposition =
  HeadlessParentDefinition.makeComposition({ bindings: [HeadlessBinding] })
export const headlessParentView = HeadlessParentComposition.makeView(
  (model, h) =>
    h.block(
      HeadlessBinding.embedView({
        slotId: 'headless',
        model: model.child,
        view: headlessView,
        viewInputs: { label: 'Count' },
      }),
    ),
)

export const KeyedParentKey = Symbol('KeyedViewPlanParent')
export const KeyedParentDefinition = Block.makeDefinition(
  'KeyedViewPlanParent',
  {
    key: KeyedParentKey,
    Model: Schema.Struct({
      children: Schema.Record(Schema.String, HeadlessDefinition.contract.Model),
    }),
    Message: Schema.Never,
    InitArgs: Schema.Tuple([]),
  },
)
export const KeyedBinding = KeyedParentDefinition.makeRecordBinding(
  HeadlessDefinition.contract,
  { field: 'children' },
)
export const KeyedParentComposition = KeyedParentDefinition.makeComposition({
  bindings: [KeyedBinding],
})
export const keyedParentView = KeyedParentComposition.makeView((model, h) =>
  h.div(
    [],
    Array.map(Record.toEntries(model.children), ([key, child]) =>
      h.block(
        KeyedBinding.embedView({
          slotId: key,
          key,
          model: child,
          view: headlessView,
          viewInputs: { label: key },
        }),
      ),
    ),
  ),
)

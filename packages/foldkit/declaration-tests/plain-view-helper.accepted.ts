import { Effect, Layer, Schema } from 'effect'
import { Block, type Html, Message, defineApplication } from 'foldkit'

export const ChildModel = Schema.Struct({ value: Schema.String })
const ChildMessage = Message.defineMessageUnion({ ClickedChild: {} })
const DeclarationViewHelperChild = Block.define('DeclarationViewHelperChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
export const DeclarationViewHelperChildComposition =
  DeclarationViewHelperChild.makeComposition()
type ChildViewBuilder = Block.ViewBuilderFor<
  typeof DeclarationViewHelperChildComposition
>
export const childViewHelper = (
  model: typeof ChildModel.Type,
  h: ChildViewBuilder,
) => h.span([], [model.value])
const childView = DeclarationViewHelperChildComposition.makeView((model, h) =>
  childViewHelper(model, h),
)
export const ChildBlock = DeclarationViewHelperChildComposition.makeBlock({
  init: DeclarationViewHelperChildComposition.makeInit(() => ({
    model: ChildModel.make({ value: 'initial' }),
  })),
  update: DeclarationViewHelperChildComposition.makeUpdate(model => ({
    model,
  })),
  view: childView,
  EffectsLayer: Layer.empty,
})

export const ParentModel = Schema.Struct({ child: ChildModel })
export const ParentMessage = Message.defineMessageUnion({
  GotChildMessage: { message: ChildBlock.Message },
  CompletedObserveParent: {},
})
export const DeclarationViewHelperParent = Block.define(
  'DeclarationViewHelperParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)
export const ObserveParent = DeclarationViewHelperParent.mount(
  'ObserveParent',
  {
    messages: [ParentMessage.CompletedObserveParent],
    handler: function* () {
      return () => Effect.succeed(ParentMessage.CompletedObserveParent())
    },
  },
)
export const ChildBinding = DeclarationViewHelperParent.bindChild(ChildBlock, {
  field: 'child',
  parentMessage: ParentMessage.GotChildMessage,
})
export const DeclarationViewHelperParentComposition =
  DeclarationViewHelperParent.makeComposition({
    childBindings: [ChildBinding],
    mounts: [ObserveParent],
  })
export type ParentViewBuilder = Block.ViewBuilderFor<
  typeof DeclarationViewHelperParentComposition
>

export const parentModelViewHelper = (
  model: typeof ParentModel.Type,
  h: ParentViewBuilder,
) =>
  h.div(
    [
      h.OnClick(ParentMessage.CompletedObserveParent()),
      h.OnMount(ObserveParent()),
    ],
    [h.block(ChildBinding.embedView({ slotId: 'child', model: model.child }))],
  )

export const parentBuilderViewHelper = (h: ParentViewBuilder) =>
  h.div([h.OnMount(ObserveParent())])

export const parentInputViewHelper = (
  childModel: typeof ChildModel.Type,
  h: ParentViewBuilder,
) =>
  h.block(ChildBinding.embedView({ slotId: 'child-input', model: childModel }))

export const parentArrayViewHelper = (
  labels: ReadonlyArray<string>,
  h: ParentViewBuilder,
) => labels.map(label => h.span([], [label]))

const sharedDivider = <SharedMessage, SharedRequirements>(
  h: Html.HtmlBuilder<SharedMessage, SharedRequirements>,
) => h.div([h.Class('divider')])

export const parentSharedViewHelper = (h: ParentViewBuilder) => sharedDivider(h)

const Application = defineApplication({
  Model: ParentModel,
  Message: ParentMessage,
})
export const ApplicationComposition = Application.makeComposition({
  childBindings: [ChildBinding],
  mounts: [ObserveParent],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>

export const applicationModelViewHelper = (
  model: typeof ParentModel.Type,
  h: ApplicationViewBuilder,
) =>
  h.main(
    [h.OnMount(ObserveParent())],
    [
      h.block(
        ChildBinding.embedView({
          slotId: 'application-child',
          model: model.child,
        }),
      ),
    ],
  )

export const applicationBuilderViewHelper = (h: ApplicationViewBuilder) =>
  h.main([])

export const applicationInputViewHelper = (
  label: string,
  h: ApplicationViewBuilder,
) => h.span([], [label])

export const applicationArrayViewHelper = (
  labels: ReadonlyArray<string>,
  h: ApplicationViewBuilder,
) => labels.map(label => h.span([], [label]))

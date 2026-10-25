import { Effect, Layer, Schema } from 'effect'
import { Block, Html, Message } from 'foldkit'

export const ChildModel = Schema.Struct({ value: Schema.String })
const ChildMessage = Message.defineMessageUnion({ ClickedChild: {} })

export const DeclarationViewHelperChildComposition = Block.makeDefinition(
  'DeclarationViewHelperChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
).makeComposition()
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
const prepareChildBlock = () =>
  DeclarationViewHelperChildComposition.prepareBlock({
    init: DeclarationViewHelperChildComposition.makeInit(() => ({
      model: ChildModel.make({ value: 'initial' }),
    })),
    update: DeclarationViewHelperChildComposition.makeUpdate({
      ClickedChild: model => ({
        model,
      }),
    }),
    view: childView,
    EffectsLayer: Layer.empty,
  })
export const ChildBlock: Block.FromAssemblyWithView<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

export const ParentModel = Schema.Struct({ child: ChildModel })
export const ParentMessage = Message.defineMessageUnion({
  CompletedObserveParent: {},
})
export const DeclarationViewHelperParentDefinition = Block.makeDefinition(
  'DeclarationViewHelperParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)
export const ObserveParent = DeclarationViewHelperParentDefinition.makeMount(
  'ObserveParent',
  {
    messages: [ParentMessage.CompletedObserveParent],
    handler: function* () {
      return () => Effect.succeed(ParentMessage.CompletedObserveParent())
    },
  },
)
export const ChildBinding = DeclarationViewHelperParentDefinition.makeBinding(
  ChildBlock,
  {
    field: 'child',
  },
)
export const DeclarationViewHelperParentComposition =
  DeclarationViewHelperParentDefinition.makeComposition({
    bindings: [ChildBinding],
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

export const ApplicationComposition = Block.makeDefinition('Application', {
  Model: ParentModel,
  Message: ParentMessage,
}).makeComposition({
  bindings: [ChildBinding],
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

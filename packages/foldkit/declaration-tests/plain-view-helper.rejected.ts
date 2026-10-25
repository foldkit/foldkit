import { Layer } from 'effect'
import { Block, Message } from 'foldkit'

import {
  ChildBinding,
  ChildBlock,
  ChildModel,
  DeclarationViewHelperChildComposition,
  DeclarationViewHelperParentDefinition,
  ObserveParent,
  ParentMessage,
  ParentModel,
  ApplicationComposition as RegisteredApplicationComposition,
  childViewHelper,
} from './plain-view-helper.accepted.js'

const AlternativeChildBinding =
  DeclarationViewHelperParentDefinition.makeBinding(ChildBlock, {
    field: 'child',
    placement: 'alternativeChild',
    init: false,
  })
const OmittedParentComposition =
  DeclarationViewHelperParentDefinition.makeComposition({
    bindings: [AlternativeChildBinding],
  })
type OmittedParentViewBuilder = Block.ViewBuilderFor<
  typeof OmittedParentComposition
>

const helperWithOmittedChild = (
  model: Readonly<{ child: typeof ChildModel.Type }>,
  h: OmittedParentViewBuilder,
) =>
  h.block(
    // @ts-expect-error The child Binding is absent from this Composition.
    ChildBinding.embedView({ slotId: 'child', model: model.child }),
  )

const helperWithOmittedMount = (h: OmittedParentViewBuilder) =>
  h.div([
    // @ts-expect-error The Mount is absent from this Composition.
    h.OnMount(ObserveParent()),
  ])

const ForeignMessage = Message.defineMessageUnion({ ClickedForeign: {} })

const helperWithForeignMessage = (h: OmittedParentViewBuilder) =>
  h.button([
    // @ts-expect-error Plain helpers accept only the Composition's Message.
    h.OnClick(ForeignMessage.ClickedForeign()),
  ])

// @ts-expect-error Composition no longer carries a render helper.
OmittedParentComposition.render

// @ts-expect-error A plain view helper cannot complete a Block as its branded view.
DeclarationViewHelperChildComposition.prepareBlock({
  init: DeclarationViewHelperChildComposition.makeInit(() => ({
    model: ChildModel.make({ value: 'initial' }),
  })),
  update: DeclarationViewHelperChildComposition.makeUpdate({
    ClickedChild: model => ({
      model,
    }),
  }),
  view: childViewHelper,
  EffectsLayer: Layer.empty,
})

const invalidOutputHelper = (_model: typeof ChildModel.Type) => 'text'

DeclarationViewHelperChildComposition.makeView((model, _h) =>
  // @ts-expect-error A canonical view must return Html rather than arbitrary helper output.
  invalidOutputHelper(model),
)

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model: ParentModel,
  Message: ParentMessage,
})
const AlternativeApplicationChildBinding = ApplicationDefinition.makeBinding(
  ChildBlock,
  {
    field: 'child',
    placement: 'alternativeApplicationChild',
    init: false,
  },
)
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [AlternativeApplicationChildBinding],
})
type OmittedApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
const applicationViewHelper = (
  model: typeof ParentModel.Type,
  h: OmittedApplicationViewBuilder,
) => h.main([], [model.child.value])

const applicationHelperWithOmittedChild = (
  model: typeof ParentModel.Type,
  h: OmittedApplicationViewBuilder,
) =>
  h.block(
    // @ts-expect-error The child Binding is absent from this Application Composition.
    ChildBinding.embedView({ slotId: 'child', model: model.child }),
  )

const applicationHelperWithOmittedMount = (h: OmittedApplicationViewBuilder) =>
  h.div([
    // @ts-expect-error The Mount is absent from this Application Composition.
    h.OnMount(ObserveParent()),
  ])

// @ts-expect-error Application Composition no longer carries a render helper.
ApplicationComposition.render

// @ts-expect-error A plain view helper cannot complete a Block as its branded view.
ApplicationComposition.prepareBlock({
  init: ApplicationComposition.makeInit(() => ({
    model: ParentModel.make({
      child: ChildModel.make({ value: 'initial' }),
    }),
  })),
  update: ApplicationComposition.makeUpdate({
    CompletedObserveParent: model => ({ model }),
  }),
  view: applicationViewHelper,
})

type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof RegisteredApplicationComposition
>
const applicationHelperWithForeignMessage = (h: ApplicationViewBuilder) =>
  h.button([
    // @ts-expect-error Application helpers retain the root Message exactly.
    h.OnClick(ForeignMessage.ClickedForeign()),
  ])

void helperWithOmittedChild
void helperWithOmittedMount
void helperWithForeignMessage
void applicationHelperWithOmittedChild
void applicationHelperWithOmittedMount
void applicationHelperWithForeignMessage

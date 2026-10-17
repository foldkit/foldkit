import { Layer } from 'effect'
import { Block, Message, defineApplication } from 'foldkit'

import {
  ChildBinding,
  ChildModel,
  DeclarationViewHelperChildComposition,
  DeclarationViewHelperParent,
  ObserveParent,
  ParentMessage,
  ParentModel,
  ApplicationComposition as RegisteredApplicationComposition,
  childViewHelper,
} from './plain-view-helper.accepted.js'

const OmittedParentComposition = DeclarationViewHelperParent.makeComposition()
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

DeclarationViewHelperChildComposition.makeBlock({
  init: DeclarationViewHelperChildComposition.makeInit(() => ({
    model: ChildModel.make({ value: 'initial' }),
  })),
  update: DeclarationViewHelperChildComposition.makeUpdate(model => ({
    model,
  })),
  // @ts-expect-error A plain view helper cannot complete a Block as its branded view.
  view: childViewHelper,
  EffectsLayer: Layer.empty,
})

const invalidOutputHelper = (_model: typeof ChildModel.Type) => 'text'

DeclarationViewHelperChildComposition.makeView((model, _h) =>
  // @ts-expect-error A canonical view must return Html rather than arbitrary helper output.
  invalidOutputHelper(model),
)

const Application = defineApplication({
  Model: ParentModel,
  Message: ParentMessage,
})
const ApplicationComposition = Application.makeComposition()
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

// @ts-expect-error A plain view helper cannot complete an Application as its branded view.
ApplicationComposition.makeElement({
  container: null,
  init: ApplicationComposition.makeInit(() => ({
    model: ParentModel.make({
      child: ChildModel.make({ value: 'initial' }),
    }),
  })),
  update: ApplicationComposition.makeUpdate(model => ({ model })),
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

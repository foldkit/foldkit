import {
  CanonicalBinding,
  ChildBlock,
  ContextBinding,
  ContextChildBlock,
  KeyedBinding,
  ParentComposition,
  ParentDefinition,
  SilentBinding,
  SilentParentDefinition,
} from './strict-routing.accepted.js'

ParentDefinition.makeBinding(ContextChildBlock, {
  // @ts-expect-error The missing context selector makes the contextual config ineligible.
  field: 'contextualChild',
  // @ts-expect-error A contextual child requires generated delivery context.
  delivery: {},
})

ParentDefinition.makeBinding(ContextChildBlock, {
  // @ts-expect-error The incomplete delivery makes the contextual config ineligible.
  field: 'contextualChild',
  // @ts-expect-error Generated delivery must supply the complete update context tuple.
  delivery: {
    toUpdateContext: () => [],
  },
})

ParentDefinition.makeBinding(ChildBlock, {
  // @ts-expect-error A context-free child cannot declare generated update context.
  field: 'child',
  // @ts-expect-error A context-free child cannot declare generated update context.
  delivery: { toUpdateContext: () => [] },
})

const ConflictingBinding = ParentDefinition.makeBinding(ContextChildBlock, {
  field: 'contextualChild',
  placement: 'child',
  delivery: {
    toUpdateContext: model => [{ multiplier: model.multiplier }],
  },
})

// @ts-expect-error Generated child placements must be unique among sibling Bindings.
ParentDefinition.makeComposition({
  bindings: [
    CanonicalBinding,
    ContextBinding,
    KeyedBinding,
    ConflictingBinding,
  ],
})

type GeneratedChildMessage = Extract<
  typeof ParentComposition.Message.Type,
  Readonly<{ placement: 'child' }>
>
ParentComposition.makeUpdate({
  // @ts-expect-error An authored handler receives local Messages, not generated child envelopes.
  ClickedReset: (model, _message: GeneratedChildMessage) => ({ model }),
})

const omittedSilentInitialization = SilentParentDefinition.makeStep(model =>
  SilentBinding.init({ args: [], toParentModel: () => model }),
)
const OmittedSilentComposition = SilentParentDefinition.makeComposition()

// @ts-expect-error Connected initialization requires its storage-only Binding to be registered.
OmittedSilentComposition.prepareBlock({
  init: OmittedSilentComposition.makeInit(() => ({
    model: { silent: { ready: false } },
  })),
  update: OmittedSilentComposition.makeUpdate({
    ClickedParent: (model, _message) =>
      // @ts-expect-error The omitted Binding requires graph capability at application.
      omittedSilentInitialization(model),
  }),
})

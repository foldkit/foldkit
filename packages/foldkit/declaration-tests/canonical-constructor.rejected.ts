import {
  ChildBlock,
  DeclarationCanonicalConstructorParentComposition,
  DeclarationCanonicalConstructorParentDefinition,
  ParentMessage,
  Payload,
} from './canonical-constructor.accepted.js'

// oxlint-disable-next-line typescript/no-explicit-any -- Erasure must not restore removed authoring fields.
declare const anyConstructor: any
declare const unknownConstructor: unknown

// @ts-expect-error Even an erased constructor cannot enable authored wrappers.
DeclarationCanonicalConstructorParentDefinition.makeRequiredFieldBinding(
  ChildBlock,
  {
    field: 'child',
    parentMessage: anyConstructor,
  },
)
// @ts-expect-error Unknown constructors cannot enable authored wrappers.
DeclarationCanonicalConstructorParentDefinition.makeRequiredFieldBinding(
  ChildBlock,
  {
    field: 'child',
    parentMessage: unknownConstructor,
  },
)
// @ts-expect-error Composition derives outgoing delivery; mapper fields are forbidden.
DeclarationCanonicalConstructorParentDefinition.makeRequiredFieldBinding(
  ChildBlock,
  {
    field: 'child',
    toParentMessage: () =>
      ParentMessage.ReceivedPayload({ payload: Payload.make('value') }),
  },
)
// @ts-expect-error Composition derives incoming routing; mapper fields are forbidden.
DeclarationCanonicalConstructorParentDefinition.makeRequiredFieldBinding(
  ChildBlock,
  {
    field: 'child',
    fromParentMessage: false,
  },
)

// @ts-expect-error Complete dispatch Schemas expose no generated wrapper constructors.
DeclarationCanonicalConstructorParentComposition.Message.GotChildMessage
// @ts-expect-error A local-only matcher cannot represent complete generated dispatch.
DeclarationCanonicalConstructorParentComposition.Message.match

import {
  ChildBlock,
  ChildMessage,
  DeclarationCanonicalConstructorParent,
  ParentMessage,
} from './canonical-constructor.accepted.js'

// oxlint-disable-next-line typescript/no-explicit-any -- This fixture verifies that an erased constructor cannot bypass exact route validation.
declare const anyConstructor: any
declare const unknownConstructor: unknown
declare const unionConstructor:
  | typeof ParentMessage.GotChildMessage
  | typeof ParentMessage.GotOtherMessage

DeclarationCanonicalConstructorParent.bindChild(ChildBlock, {
  // @ts-expect-error A canonical constructor must retain exact delivery evidence.
  field: 'child',
  // @ts-expect-error An erased canonical constructor cannot own a Message route.
  parentMessage: anyConstructor,
})
DeclarationCanonicalConstructorParent.bindChild(ChildBlock, {
  // @ts-expect-error A canonical constructor must retain exact delivery evidence.
  field: 'child',
  // @ts-expect-error An unknown canonical constructor cannot own a Message route.
  parentMessage: unknownConstructor,
})
DeclarationCanonicalConstructorParent.bindChild(ChildBlock, {
  // @ts-expect-error A canonical constructor must identify one Message variant.
  field: 'child',
  // @ts-expect-error A constructor union cannot declare one exact Message route.
  parentMessage: unionConstructor,
})
DeclarationCanonicalConstructorParent.bindChild(ChildBlock, {
  // @ts-expect-error Canonical Message wrappers accept only the child Message.
  field: 'child',
  // @ts-expect-error The parent constructor requires an unrelated extra field.
  parentMessage: ParentMessage.GotExtraMessage,
})
DeclarationCanonicalConstructorParent.bindChild(ChildBlock, {
  // @ts-expect-error Canonical Message wrappers accept this child's Message.
  field: 'child',
  // @ts-expect-error The parent constructor expects a different Message payload.
  parentMessage: ParentMessage.GotWrongMessage,
})
DeclarationCanonicalConstructorParent.bindChild(ChildBlock, {
  // @ts-expect-error A Binding cannot declare both Message mapping forms.
  field: 'child',
  // @ts-expect-error A Binding cannot declare both Message mapping forms.
  parentMessage: ParentMessage.GotChildMessage,
  // @ts-expect-error A Binding cannot declare both Message mapping forms.
  toParentMessage: (message: typeof ChildMessage.Type) =>
    ParentMessage.GotChildMessage({ message }),
})

DeclarationCanonicalConstructorParent.bindChild(ChildBlock, {
  // @ts-expect-error Canonical Message wrappers declare only the child Message field.
  field: 'child',
  // @ts-expect-error Optional unrelated fields still invalidate the canonical wrapper.
  parentMessage: ParentMessage.GotOptionalExtraMessage,
})

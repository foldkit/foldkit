import {
  BindingMessagePolicyParentDefinition,
  ContextChildBlock,
  ParentMessage,
  SilentChildBlock,
} from './binding-message-policy.accepted.js'

// @ts-expect-error Parent Message wrappers are generated from the Binding placement.
BindingMessagePolicyParentDefinition.makeRequiredFieldBinding(
  ContextChildBlock,
  {
    field: 'child',
    toParentMessage: () => ParentMessage.ClickedSave(),
    delivery: { toUpdateContext: () => [{ roomId: 'room' }] },
  },
)

// @ts-expect-error Parent Message wrappers are generated from the Binding placement.
BindingMessagePolicyParentDefinition.makeRequiredFieldBinding(
  ContextChildBlock,
  {
    field: 'child',
    fromParentMessage: false,
    delivery: { toUpdateContext: () => [{ roomId: 'room' }] },
  },
)

BindingMessagePolicyParentDefinition.makeRequiredFieldBinding(
  ContextChildBlock,
  {
    field: 'child',
    // @ts-expect-error Generated delivery must return the child's exact extra update arguments.
    delivery: { toUpdateContext: () => [] },
  },
)

// @ts-expect-error A Message-free child cannot configure generated delivery.
BindingMessagePolicyParentDefinition.makeRequiredFieldBinding(
  SilentChildBlock,
  {
    field: 'silent',
    delivery: {},
  },
)

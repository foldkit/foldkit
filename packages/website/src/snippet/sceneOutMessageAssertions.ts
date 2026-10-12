import {
  click,
  expectNoOutMessage,
  expectOutMessage,
  expectOutMessages,
  given,
  role,
  scene,
} from 'foldkit/scene'

scene(
  { update, view },
  given(initialModel),
  click(role('button', { name: 'Log out' })),
  expectOutMessage(OutMessage.RequestedLogout()),
  click(role('button', { name: 'Dismiss notification' })),
  expectNoOutMessage(),
)

scene(
  { update, view: treeRowView },
  given(initialModel),
  click(role('button', { name: 'Expand' })),
  expectOutMessages(
    OutMessage.RequestedExpand(),
    OutMessage.RequestedSelection(),
  ),
)

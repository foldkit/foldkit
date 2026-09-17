const keydown = Subscription.fromEvent<KeyboardEvent, Message>({
  target: window,
  type: 'keydown',
  toMessage: event => Message.PressedKey({ key: event.key }),
})

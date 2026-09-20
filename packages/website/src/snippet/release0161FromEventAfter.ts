const keydown = Subscription.fromEvent({
  target: window,
  type: 'keydown',
  toMessage: event => Message.PressedKey({ key: event.key }),
})

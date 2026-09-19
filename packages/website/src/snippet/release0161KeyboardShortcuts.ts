const shortcuts = Subscription.keyboardShortcuts<Message>({
  bindings: [
    {
      shortcut: 'Mod+K',
      whileTyping: 'Allow',
      toMessage: () => Message.PressedSearchShortcut(),
    },
    {
      shortcut: ['G', 'H'],
      toMessage: () => Message.PressedHomeShortcut(),
    },
  ],
})

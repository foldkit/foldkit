const Command = {
  mapMessages: (
    messages: ReadonlyArray<unknown>,
    toMessage: (message: unknown) => unknown,
  ) => messages.map(toMessage),
}

const ForwardedMessage = (message: unknown) => message

export const mapLocalMessages = (messages: ReadonlyArray<unknown>) =>
  Command.mapMessages(messages, message => ForwardedMessage(message))

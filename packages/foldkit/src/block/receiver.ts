import type { Schema } from 'effect'

type AnyFunction = (...args: ReadonlyArray<any>) => any

type Receiver = Readonly<{
  InMessage: Schema.Top
  receive: AnyFunction
}>

const receivers = new WeakMap<object, Receiver>()

/** @internal Retains the separate pure input executor of an original acquired Block. */
export const registerBlockReceiver = (
  block: object,
  InMessage: Schema.Top,
  receive: AnyFunction,
): void => {
  receivers.set(block, Object.freeze({ InMessage, receive }))
}

/** @internal Reads an authenticated input executor without changing the local Message Codec. */
export const blockReceiverOf = (block: object): Receiver | undefined =>
  receivers.get(block)

/** @internal Preserves input execution when original handler selection derives a Block. */
export const copyBlockReceiver = (source: object, target: object): void => {
  const receiver = receivers.get(source)

  if (receiver !== undefined) {
    receivers.set(target, receiver)
  }
}

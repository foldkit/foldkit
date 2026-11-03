import type { Schema } from 'effect'

type AnyFunction = (...args: ReadonlyArray<any>) => any

type InputUpdate = Readonly<{
  InMessage: Schema.Top
  inMessageUpdate: AnyFunction
}>

const inputUpdates = new WeakMap<object, InputUpdate>()

/** @internal Retains the separate pure input executor of an original acquired Block. */
export const registerBlockInMessageUpdate = (
  block: object,
  InMessage: Schema.Top,
  inMessageUpdate: AnyFunction,
): void => {
  inputUpdates.set(block, Object.freeze({ InMessage, inMessageUpdate }))
}

/** @internal Reads an authenticated input executor without changing the local Message Codec. */
export const blockInMessageUpdateOf = (
  block: object,
): InputUpdate | undefined => inputUpdates.get(block)

/** @internal Preserves input execution when original handler selection derives a Block. */
export const copyBlockInMessageUpdate = (
  source: object,
  target: object,
): void => {
  const inputUpdate = inputUpdates.get(source)

  if (inputUpdate !== undefined) {
    inputUpdates.set(target, inputUpdate)
  }
}

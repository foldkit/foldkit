declare const model: unknown
declare const propertyName: string
declare const dynamicCommands: ReadonlyArray<unknown>

export const emptyCommands = { model, commands: [] }
export const trailingCommaCommands = {
  commands: [],
}
export const quotedCommands = { model, 'commands': [] }
export const computedCommands = { model, ['commands']: [] }
export const commentedCommands = {
  model,
  commands: [
    // A comment does not make this a Command.
  ],
}
export const dynamicProperty = {
  [propertyName]: dynamicCommands,
  commands: [],
}

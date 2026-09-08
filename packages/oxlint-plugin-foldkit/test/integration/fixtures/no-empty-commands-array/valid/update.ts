declare const model: unknown
declare const commands: ReadonlyArray<unknown>
declare const optionalCommands: ReadonlyArray<unknown> | undefined
declare const commandKey: string

declare const buildCommands: (model: unknown) => ReadonlyArray<unknown>

export const omittedCommands = { model }
export const existingCommands = { model, commands }
export const normalizedCommands = { model, commands: optionalCommands ?? [] }
export const builtCommands = { model, commands: buildCommands(model) }
export const dynamicProperty = { model, [commandKey]: [] }
export const nonEmptyCommands = { model, commands: [{}] }

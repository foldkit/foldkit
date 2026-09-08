/** Type-level brand for CommandDefinition values. */
/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
export const CommandDefinitionTypeId: unique symbol = Symbol.for(
  'foldkit/CommandDefinition',
) as unknown as CommandDefinitionTypeId

/** Type-level brand for CommandDefinition values. */
export type CommandDefinitionTypeId = typeof CommandDefinitionTypeId

/** @internal Stamps a callable Definition with its Command name and the
 *  {@link CommandDefinitionTypeId} brand, so `Story`/`Scene` matchers and the
 *  runtime recognise it. Internal to the Command module. */
export const brandAsDefinition = (definition: unknown, name: string): void => {
  Object.defineProperty(definition, 'name', {
    value: name,
    configurable: true,
  })
  Object.defineProperty(definition, CommandDefinitionTypeId, {
    value: CommandDefinitionTypeId,
  })
}

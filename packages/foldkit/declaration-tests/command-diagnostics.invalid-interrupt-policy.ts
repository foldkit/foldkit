import { Schema } from 'effect'
import { Command } from 'foldkit'

const Args = Schema.Struct({ id: Schema.String, revision: Schema.Number })

export const broadPolicy: Command.InterruptOption<typeof Args.Type> = {
  keyFields: ['id'],
  toKey: keyArgs => `${keyArgs.id}:${keyArgs.revision.toFixed()}`,
}

export const unionPolicy: Command.InterruptOption<
  typeof Args.Type,
  'id' | 'revision'
> = {
  keyFields: ['id'],
  toKey: keyArgs => `${keyArgs.id}:${keyArgs.revision.toFixed()}`,
}

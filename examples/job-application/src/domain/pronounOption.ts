import { Schema } from 'effect'

export const PronounOption = Schema.Literals([
  'He/Him',
  'She/Her',
  'They/Them',
  'He/They',
  'She/They',
  'Other',
])
export type PronounOption = typeof PronounOption.Type

export const all: ReadonlyArray<PronounOption> = PronounOption.literals

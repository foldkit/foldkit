import { Schema as S } from 'effect'

export const PronounOption = S.Literals([
  'He/Him',
  'She/Her',
  'They/Them',
  'He/They',
  'She/They',
  'Other',
])
export type PronounOption = typeof PronounOption.Type

export const all: ReadonlyArray<PronounOption> = PronounOption.literals

export const show = (option: PronounOption): string => option

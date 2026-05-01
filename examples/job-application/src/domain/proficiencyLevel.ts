import { Schema as S } from 'effect'

export const ProficiencyLevel = S.Literals([
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
])
export type ProficiencyLevel = typeof ProficiencyLevel.Type

export const all: ReadonlyArray<ProficiencyLevel> = ProficiencyLevel.literals

export const show = (level: ProficiencyLevel): string => level

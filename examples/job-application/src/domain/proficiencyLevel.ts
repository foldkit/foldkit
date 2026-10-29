import { Schema } from 'effect'

export const ProficiencyLevel = Schema.Literals([
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
])
export type ProficiencyLevel = typeof ProficiencyLevel.Type

export const all: ReadonlyArray<ProficiencyLevel> = ProficiencyLevel.literals

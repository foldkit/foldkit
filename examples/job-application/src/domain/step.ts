import { Match, Schema } from 'effect'

export const Step = Schema.Literals([
  'PersonalInfo',
  'WorkHistory',
  'Education',
  'Skills',
  'CoverLetter',
  'Attachments',
  'Review',
])
export type Step = typeof Step.Type

export const all = Step.literals

export const indexOf = (step: Step): number => all.indexOf(step)

export const show = (step: Step): string =>
  Match.value(step).pipe(
    Match.when('PersonalInfo', () => 'Personal Info'),
    Match.when('WorkHistory', () => 'Work History'),
    Match.when('Education', () => 'Education'),
    Match.when('Skills', () => 'Skills'),
    Match.when('CoverLetter', () => 'Cover Letter'),
    Match.when('Attachments', () => 'Attachments'),
    Match.when('Review', () => 'Review'),
    Match.exhaustive,
  )

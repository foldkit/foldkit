import { Match as M, Schema as S } from 'effect'

export const Step = S.Literal(
  'PersonalInfo',
  'WorkHistory',
  'Education',
  'Skills',
  'CoverLetter',
  'Attachments',
  'Review',
)
export type Step = typeof Step.Type

export const all = Step.literals

export const indexOf = (step: Step): number => all.indexOf(step)

export const show = (step: Step): string =>
  M.value(step).pipe(
    M.when('PersonalInfo', () => 'Personal Info'),
    M.when('WorkHistory', () => 'Work History'),
    M.when('Education', () => 'Education'),
    M.when('Skills', () => 'Skills'),
    M.when('CoverLetter', () => 'Cover Letter'),
    M.when('Attachments', () => 'Attachments'),
    M.when('Review', () => 'Review'),
    M.exhaustive,
  )

import { Field, type Rules, validate } from 'foldkit/fieldValidation'

export const revealFieldErrors =
  <A>(rules: Rules<A>) =>
  (field: Field<A>): Field<A> =>
    field._tag === 'NotValidated' ? validate(rules)(field.value) : field

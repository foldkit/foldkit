import { Function, Option, String } from 'effect'

export const fromString = Option.liftPredicate(String.isNonEmpty)

export const when: {
  <A>(value: A): (condition: boolean) => Option.Option<A>
  <A>(condition: boolean, value: A): Option.Option<A>
} = Function.dual(
  2,
  <A>(condition: boolean, value: A): Option.Option<A> =>
    Option.liftPredicate(value, () => condition),
)

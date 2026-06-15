import { Function, Option } from 'effect'

export const when: {
  <A>(value: A): (condition: boolean) => Option.Option<A>
  <A>(condition: boolean, value: A): Option.Option<A>
} = Function.dual(
  2,
  <A>(condition: boolean, value: A): Option.Option<A> =>
    Option.liftPredicate(value, () => condition),
)

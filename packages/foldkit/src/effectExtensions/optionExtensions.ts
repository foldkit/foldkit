import { Function, Option, Result, String } from 'effect'

export const fromString = Option.liftPredicate(String.isNonEmpty)

export const when: {
  <A>(value: A): (condition: boolean) => Option.Option<A>
  <A>(condition: boolean, value: A): Option.Option<A>
} = Function.dual(
  2,
  <A>(condition: boolean, value: A): Option.Option<A> =>
    Option.liftPredicate(value, () => condition),
)

/** Converts an `Option<A>` to a `Result<A, void>`, suitable for v4 Array
 *  and Stream filter/filterMap callbacks that expect a Result. */
export const asResult = <A>(option: Option.Option<A>): Result.Result<A, void> =>
  Option.match(option, {
    onNone: () => Result.failVoid,
    onSome: Result.succeed,
  })

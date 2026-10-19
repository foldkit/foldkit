import { Option, Predicate } from 'effect'
import type { AddressInfo } from 'node:net'

export const boundPort = (
  address: AddressInfo | string | null | undefined,
): Option.Option<number> => {
  return Option.liftPredicate((address): address is AddressInfo =>
    Predicate.not(Predicate.or(Predicate.isNullish, Predicate.isString))(
      address,
    ),
  )(address).pipe(Option.map(({ port }) => port))
}

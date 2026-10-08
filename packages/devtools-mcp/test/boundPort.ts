import { Option, Predicate } from 'effect'
import type { AddressInfo } from 'node:net'

export const boundPort = (
  address: AddressInfo | string | null | undefined,
): Option.Option<number> => {
  if (Predicate.isNullish(address) || Predicate.isString(address)) {
    return Option.none()
  } else {
    return Option.some(address.port)
  }
}

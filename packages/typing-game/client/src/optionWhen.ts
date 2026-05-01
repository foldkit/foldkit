// @ts-nocheck
import { Function, Option } from 'effect'

export const optionWhen = <T>(
  condition: boolean,
  value: Function.LazyArg<T>,
): Option.Option<T> => {
  return condition ? Option.some(value()) : Option.none()
}

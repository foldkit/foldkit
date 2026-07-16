import { Schema as S } from 'effect'

export const islandAttributes = {
  Counter: S.Struct({ label: S.optionalKey(S.String) }),
  Note: S.Struct({}),
}

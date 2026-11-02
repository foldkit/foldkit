const EffectsContractTypeId = Symbol('foldkit/Block/EffectsContract')

/** Declared failure and Service channels of a Block's handler Layer. */
export interface EffectsContract<Error, Requirements> {
  readonly [EffectsContractTypeId]: Readonly<{
    error?: Error
    requirements?: Requirements
  }>
}

/**
 * Declares nonserialized handler-Layer channels without enumerating Service
 * keys or inventing an error Schema. Completion checks the actual Layer
 * against these bounds. Construction of the executable graph remains separate.
 */
export const makeEffectsContract = <
  Error = never,
  Requirements = never,
>(): EffectsContract<Error, Requirements> =>
  Object.freeze({ [EffectsContractTypeId]: Object.freeze({}) })

/** @internal Reads a declared handler-Layer failure channel. */
export type EffectsErrorOf<Declaration> =
  Declaration extends EffectsContract<infer Error, any> ? Error : never

/** @internal Reads declared ordinary handler-Layer Services. */
export type EffectsRequirementsOf<Declaration> =
  Declaration extends EffectsContract<any, infer Requirements>
    ? Requirements
    : never

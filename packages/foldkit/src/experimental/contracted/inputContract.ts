import type { Schema } from 'effect'

const InputContractTypeId = Symbol('foldkit/Block/InputContract')

/** A TypeScript input shape that is neither decoded nor encoded. */
export interface InputContract<Value> {
  readonly [InputContractTypeId]: Readonly<{ Type?: Value }>
}

/**
 * Declares nonserialized input types, including callbacks and generic view
 * inputs. Model, Message, and OutMessage contracts continue to use Schemas.
 */
export const makeInputContract = <Value>(): InputContract<Value> =>
  Object.freeze({ [InputContractTypeId]: Object.freeze({}) })

/** @internal Reads Schema-backed or nonserialized input declarations. */
export type InputOf<Declaration> =
  Declaration extends Schema.Codec<any, any, any, any>
    ? Declaration['Type']
    : Declaration extends InputContract<infer Value>
      ? Value
      : never

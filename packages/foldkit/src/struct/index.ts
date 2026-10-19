import { Struct } from 'effect'

type EvolveTransform<O> = Partial<{
  [K in keyof O]: (a: O[K]) => O[K]
}>

type StrictKeys<O, T> =
  T extends Record<string, any>
    ? Exclude<keyof T, keyof O> extends never
      ? T
      : T & {
          [K in `Invalid key: ${Exclude<keyof T, keyof O> & string}`]: never
        }
    : never

type Evolved<O, T> = {
  [K in keyof O]: K extends keyof T
    ? T[K] extends (a: any) => infer R
      ? R
      : O[K]
    : O[K]
}

/** Immutably modifies fields of a struct by applying transform functions. Each transformer must return its field's existing type. Wraps Effect's `Struct.evolve` with stricter key checking. */
export const modifyFields: {
  <O, const T extends EvolveTransform<O>>(
    t: StrictKeys<O, T>,
  ): (obj: O) => Evolved<O, T>
  <O, const T extends EvolveTransform<O>>(
    obj: O,
    t: StrictKeys<O, T>,
  ): Evolved<O, T>
} = Struct.evolve

/** Creates a field modifier for a base shape. Use in generic helpers whose Model extends that shape. Transformers are checked against the base shape, and the returned function preserves the Model's subtype and all fields not in the transform. */
export const makeModifyFieldsFor =
  <Base extends Record<string, unknown>>() =>
  <Model extends Base>(
    model: Model,
    transforms: EvolveTransform<Base>,
  ): Model =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    Struct.evolve(model, transforms as any) as Model

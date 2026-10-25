import { Struct } from 'effect'

/**
 * Per-field transformations that preserve each declared field's value type.
 * Useful for authoring helpers that accept field updates instead of a complete
 * Model transformation. `modifyFields` and `Definition.makeFieldsStep` perform
 * their own unknown-key and result validation; this structural type alone does
 * not enforce exact keys or preserve relationships between tagged variants.
 */
export type FieldTransforms<Model> = Partial<{
  [Field in keyof Model]: (value: Model[Field]) => Model[Field]
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
  <O, const T extends FieldTransforms<O>>(
    t: StrictKeys<O, T>,
  ): (obj: O) => Evolved<O, T>
  <O, const T extends FieldTransforms<NoInfer<O>>>(
    obj: O,
    t: StrictKeys<NoInfer<O>, T>,
  ): Evolved<O, T>
} = Struct.evolve

/** Creates a field modifier for a base shape. Use in generic helpers whose Model extends that shape. Transformers are checked against the base shape, and the returned function preserves the Model's subtype and all fields not in the transform. */
export const makeModifyFieldsFor =
  <Base extends Record<string, unknown>>() =>
  <Model extends Base>(
    model: Model,
    transforms: FieldTransforms<Base>,
  ): Model =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    Struct.evolve(model, transforms as any) as Model

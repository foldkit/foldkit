import { Function } from 'effect'

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

const evolveFields = (
  struct: object,
  transforms: Readonly<Record<PropertyKey, (value: unknown) => unknown>>,
): Record<PropertyKey, unknown> => {
  const evolved: Record<PropertyKey, unknown> = { ...struct }

  for (const key of Reflect.ownKeys(transforms)) {
    const transform = transforms[key]

    if (
      transform !== undefined &&
      Object.prototype.propertyIsEnumerable.call(struct, key)
    ) {
      evolved[key] = transform(evolved[key])
    }
  }

  return evolved
}

/** Immutably modifies fields of a struct by applying transform functions. Each transformer must return its field's existing type. Behaves like Effect's `Struct.evolve` with stricter key checking: the result has the struct's own enumerable keys in the same order, and only the given transforms run. */
export const modifyFields: {
  <O, const T extends EvolveTransform<O>>(
    t: StrictKeys<O, T>,
  ): (obj: O) => Evolved<O, T>
  <O, const T extends EvolveTransform<O>>(
    obj: O,
    t: StrictKeys<O, T>,
  ): Evolved<O, T>
} = Function.dual(2, evolveFields)

/** Creates a field modifier for a base shape. Use in generic helpers whose Model extends that shape. Transformers are checked against the base shape, and the returned function preserves the Model's subtype and all fields not in the transform. */
export const makeModifyFieldsFor =
  <Base extends Record<string, unknown>>() =>
  <Model extends Base>(
    model: Model,
    transforms: EvolveTransform<Base>,
  ): Model =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    evolveFields(model, transforms as any) as Model

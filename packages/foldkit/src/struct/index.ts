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

/** Immutably updates fields of a struct by applying transform functions. Wraps Effect's `Struct.evolve` with stricter key checking. */
export const evo: {
  <O, const T extends EvolveTransform<O>>(
    t: StrictKeys<O, T>,
  ): (obj: O) => Evolved<O, T>
  <O, const T extends EvolveTransform<O>>(
    obj: O,
    t: StrictKeys<O, T>,
  ): Evolved<O, T>
} = Struct.evolve

/** Creates a variant of `evo` whose transforms are checked against a supertype. Useful in generic contexts where `evo`'s `StrictKeys` can't resolve `keyof` on an open type parameter. The returned function evolves a subtype model, preserving all fields not in the transform, and returns the subtype. */
export const makeConstrainedEvo =
  <Constraint extends Record<string, unknown>>() =>
  <Model extends Constraint>(
    model: Model,
    transforms: EvolveTransform<Constraint>,
  ): Model =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    Struct.evolve(model, transforms as any) as Model

declare const OperationEmissionTypeId: unique symbol

/** @internal Compiler-derived emission metadata for a projected operation. */
export interface OperationEmission<Emission> {
  readonly [OperationEmissionTypeId]: (emission: Emission) => Emission
}

type IsFalse<Value> = 0 extends 1 & Value
  ? false
  : [Value] extends [never]
    ? false
    : [Value] extends [false]
      ? true
      : false

/** @internal Missing or erased operation metadata conservatively retains policy. */
export type IsSilentOperation<Producer> = 0 extends 1 & Producer
  ? false
  : [Producer] extends [never]
    ? false
    : typeof OperationEmissionTypeId extends keyof Producer
      ? 0 extends 1 & Producer[typeof OperationEmissionTypeId]
        ? false
        : Producer[typeof OperationEmissionTypeId] extends (
              emission: infer Input,
            ) => infer Output
          ? IsFalse<Input> extends true
            ? IsFalse<Output>
            : false
          : false
      : false

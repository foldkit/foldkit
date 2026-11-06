declare const PrivateDeliveryTypeId: unique symbol
declare const PrivateEncodedDeliveryTypeId: unique symbol

/** A descendant Message validated by an acquired executable's private Codec. */
export interface PrivateDelivery<OwnerValue> {
  readonly [PrivateDeliveryTypeId]: OwnerValue
  readonly _tag: string
}

/** Encoded private delivery whose concrete wire format belongs to the executable. */
export interface PrivateEncodedDelivery<OwnerValue> {
  readonly [PrivateEncodedDeliveryTypeId]: OwnerValue
  readonly _tag: string
}

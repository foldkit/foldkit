/**
 * @internal Derives generated Binding method names from InMessage facts:
 * `RequestedX` becomes `requestX`, and `InformedOfX` becomes `informOfX`.
 * The remaining suffix is preserved exactly; empty operation names and other
 * prefixes are rejected.
 */
export type InputOperationName<Tag extends PropertyKey> =
  Tag extends `Requested${infer Operation}`
    ? Operation extends ''
      ? never
      : `request${Operation}`
    : Tag extends `InformedOf${infer Operation}`
      ? Operation extends ''
        ? never
        : `informOf${Operation}`
      : never

/** @internal Enforces the finite InMessage naming protocol at runtime. */
export const inputOperationName = (tag: string): string => {
  if (tag.startsWith('Requested') && tag.length > 'Requested'.length) {
    return `request${tag.slice('Requested'.length)}`
  }

  if (tag.startsWith('InformedOf') && tag.length > 'InformedOf'.length) {
    return `informOf${tag.slice('InformedOf'.length)}`
  }

  throw new Error(
    '[foldkit] InMessage variants must use Requested... or InformedOf... with a nonempty operation name.',
  )
}

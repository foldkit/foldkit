import { Schema } from 'effect'

import { type MessageUnion, defineMessageUnion } from '../schema/index.js'
import {
  type InputOperationName,
  inputOperationName,
} from './inMessageOperation.js'

type InvalidInMessageTag<Tag extends PropertyKey> = Readonly<{
  'InMessage variants must use Requested... or InformedOf... with a nonempty operation name': Tag
}>

type ValidateInMessageVariantNames<
  CasesByTag extends Record<string, Schema.Struct.Fields>,
> = {
  readonly [Tag in keyof CasesByTag]: [InputOperationName<Tag>] extends [never]
    ? InvalidInMessageTag<Tag>
    : unknown
}

/**
 * Declares every parent-to-child InMessage variant in one object.
 * `RequestedX` variants generate `requestX` Binding methods, while
 * `InformedOfX` variants generate `informOfX` methods.
 *
 * The returned Schema and namespace have the same constructors and exhaustive
 * matcher as `defineMessageUnion`. Variants must use one of the two InMessage
 * prefixes and include a nonempty operation name.
 *
 * @example
 * ```typescript
 * export const InMessage = defineInMessageUnion({
 *   RequestedSave: { documentId: Schema.String },
 *   InformedOfRoute: { path: Schema.String },
 * })
 * export type InMessage = typeof InMessage.Type
 * ```
 */
export function defineInMessageUnion<
  const CasesByTag extends Record<string, Schema.Struct.Fields>,
>(
  casesByTag: CasesByTag & ValidateInMessageVariantNames<CasesByTag>,
): MessageUnion<CasesByTag>
export function defineInMessageUnion(
  casesByTag: Record<string, Schema.Struct.Fields>,
): MessageUnion<Record<string, Schema.Struct.Fields>> {
  for (const tag of Object.keys(casesByTag)) {
    inputOperationName(tag)
  }

  return defineMessageUnion(casesByTag)
}

import { Schema } from 'effect'
import * as BlockFamily from 'foldkit/internal/block'

import { TabsFamily } from './block.js'
import { makeAuthoring } from './composition.js'
import type { ValueSchema } from './types.js'

const declareBlock = <Value extends string, ValueEncoded>(
  Value: ValueSchema<Value, ValueEncoded>,
) => {
  const authoring = makeAuthoring(Value)

  return BlockFamily.resolveFamily(
    authoring.Definition,
    TabsFamily,
    implementation => implementation.construct(authoring),
  )
}

type Contract<Value extends string, ValueEncoded> = ReturnType<
  typeof declareBlock<Value, ValueEncoded>
>
/** Passive Tabs contract retaining its exact selected-value Codec. */
export interface Completed<
  Value extends string = string,
  ValueEncoded = Value,
> extends Contract<Value, ValueEncoded> {}

/** Declares a Tabs contract. Pass a string Value Schema, or omit it for
 * unrestricted strings. Provide Tabs.layer when constructing the parent.
 *
 * @example
 * ```ts
 * const Section = Schema.Literals(['Overview', 'Activity'])
 * const SectionTabsBlock = Tabs.makeBlock(Section)
 * ```
 */
export function makeBlock(): Completed<string>
export function makeBlock<Value extends string, ValueEncoded>(
  Value: ValueSchema<Value, ValueEncoded>,
): Completed<Value, ValueEncoded>
export function makeBlock(
  Value: ValueSchema<string, unknown> = Schema.String,
): object {
  return declareBlock(Value)
}

export {
  ActivationMode,
  InitConfig,
  Orientation,
  PanelMount,
  type ViewInputs,
  type RenderInfo,
  type TabInfo,
} from './types.js'

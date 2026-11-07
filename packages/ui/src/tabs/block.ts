import { Context, Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as BlockFamily from 'foldkit/internal/block'

import { FocusTab } from './command.js'
import { makeAuthoring } from './composition.js'

type Authoring<Value extends string, ValueEncoded> = ReturnType<
  typeof makeAuthoring<Value, ValueEncoded>
>

const construct = <Value extends string, ValueEncoded>(
  authoring: Authoring<Value, ValueEncoded>,
) =>
  authoring.Definition.makeLayer({
    init: authoring.init,
    update: authoring.update,
    view: authoring.view,
    EffectsLayer: FocusTab.layer,
  })

interface TabsImplementation extends Block.FamilyLifetime {
  readonly construct: typeof construct
}

/** @internal Scoped provider for Schema-specific Tabs implementations. */
export class TabsFamily extends Context.Service<
  TabsFamily,
  TabsImplementation
>()('foldkit/ui/Tabs') {}

/** Constructs Tabs implementations with their selected-value Codecs. */
export const layer = Layer.effect(
  TabsFamily,
  Effect.gen(function* () {
    const lifetime = yield* Block.familyLifetime

    return { ...lifetime, construct }
  }),
)

const defaultAuthoring = makeAuthoring(Schema.String)
/** @internal Default string contract and provider used by interaction tests. */
export const block = {
  block: BlockFamily.resolveFamily(
    defaultAuthoring.Definition,
    TabsFamily,
    implementation => implementation.construct(defaultAuthoring),
  ),
  layer,
}

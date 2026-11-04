import { Context, Effect, Layer } from 'effect'
import * as Block from 'foldkit/block'
import * as BlockFamily from 'foldkit/internal/block'

import { makeFixedFamilyLayer } from '../internal/fixedFamily.js'
import { FocusTab } from './command.js'
import { TabsBlock } from './definition.js'
import { init } from './init.js'
import { update } from './update.js'
import { view } from './view.js'

/** @internal Checked canonical Tabs implementation for internal tests. */
const canonicalLayer = TabsBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      EffectsLayer: FocusTab.layer,
    }
  }),
)

/** @internal Exact canonical public selection. */
export type CanonicalIdentity = Block.SelectedPublicIdentity<typeof TabsBlock>
const TabsRefinementRule = Symbol('Tabs.Refinement')
/** @internal Closed Value refinement identity. */
export interface TabsRefinementKey {
  readonly [TabsRefinementRule]: true
}
type CanonicalImplementation = Extract<
  Layer.Success<typeof canonicalLayer>,
  Block.SelectedImplementationFacts<
    CanonicalIdentity,
    unknown,
    unknown,
    unknown
  >
>
/** @internal Captured implementation capability for this fixed family. */
export interface SharedTabsProof extends Block.ClosedFamilyCapability<TabsRefinementKey> {}
/** @internal The shared provider's original canonical implementation facts. */
export interface SharedTabsFacts extends Block.FixedRefinementProvider<
  TabsRefinementKey,
  CanonicalIdentity,
  CanonicalImplementation
> {}
const SharedTabsProof = Context.Service<
  SharedTabsProof,
  Readonly<{ executable: object }>
>('foldkit/ui/private/Tabs.SharedImplementation')
const SharedTabsFacts = Context.Service<
  SharedTabsFacts,
  Readonly<Record<never, never>>
>('foldkit/ui/private/Tabs.SharedFacts')
/** Constructs the shared implementation used by every type-only Tabs specialization. */
export const layer = makeFixedFamilyLayer(
  TabsBlock,
  canonicalLayer,
  BlockFamily.readDeclaredExecutable(TabsBlock),
  SharedTabsProof,
  SharedTabsFacts,
)

Reflect.deleteProperty(TabsBlock, 'makeLayer')
Reflect.deleteProperty(TabsBlock, 'provideHandlers')
Object.freeze(TabsBlock)

/** @internal Selected implementation used by component tests. */
export const block = { block: TabsBlock, layer }

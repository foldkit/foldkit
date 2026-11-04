import { Effect } from 'effect'
import * as Block from 'foldkit/block'

import {
  CounterDefinition,
  EffectsLayer,
  firstInit,
  firstUpdate,
  firstView,
  foreignUpdate,
  foreignView,
  init,
  secondInit,
  secondUpdate,
  secondView,
  update,
  view,
} from './constructor-plan-ownership.accepted.js'

type OutputOf<Value> = Value extends Block.Plan<infer Output> ? Output : never
type SourceOf<Value> =
  Value extends Block.Plan<
    unknown,
    'Init' | 'Update' | 'InMessageUpdate' | 'View',
    infer Source
  >
    ? Source
    : never

declare const foreignSourceView: Block.Plan<
  OutputOf<typeof view>,
  'View',
  SourceOf<typeof foreignUpdate>
>
declare const otherGraphView: Block.Plan<
  OutputOf<typeof firstView>,
  'View',
  SourceOf<typeof secondUpdate>
>
declare const erasedUpdateSource: Block.Plan<
  OutputOf<typeof update>,
  'Update',
  any
>
declare const erasedViewSource: Block.Plan<OutputOf<typeof view>, 'View', any>
declare const unknownUpdateSource: Block.Plan<
  OutputOf<typeof update>,
  'Update',
  unknown
>
declare const unknownViewSource: Block.Plan<
  OutputOf<typeof view>,
  'View',
  unknown
>
declare const erasedInitSource: Block.Plan<OutputOf<typeof init>, 'Init', any>
declare const unknownInitSource: Block.Plan<
  OutputOf<typeof init>,
  'Init',
  unknown
>
declare const isFirst: boolean

const crossed = isFirst
  ? {
      children: [],
      init: firstInit,
      update: secondUpdate,
      view: firstView,
      EffectsLayer,
    }
  : {
      children: [],
      init: secondInit,
      update: firstUpdate,
      view: secondView,
      EffectsLayer,
    }

// @ts-expect-error Identical decoded Model/Message types do not substitute another update owner.
CounterDefinition.makeBlock(
  Effect.succeed({ children: [], init, update: foreignUpdate, view }),
)
// @ts-expect-error Identical decoded Model/Message types do not substitute another view owner.
CounterDefinition.makeBlock(
  Effect.succeed({ children: [], init, update, view: foreignView }),
)
// @ts-expect-error An update must retain init's registered Mount graph.
CounterDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: firstInit,
    update: secondUpdate,
    view: firstView,
    EffectsLayer,
  }),
)
// @ts-expect-error A view must retain init's registered Mount graph.
CounterDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: firstInit,
    update: firstUpdate,
    view: secondView,
    EffectsLayer,
  }),
)
// @ts-expect-error Compatible rendering output cannot substitute a foreign view Source.
CounterDefinition.makeBlock(
  Effect.succeed({ children: [], init, update, view: foreignSourceView }),
)
// @ts-expect-error The view Source retains registered Mounts independently of its rendering output.
CounterDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: firstInit,
    update: firstUpdate,
    view: otherGraphView,
    EffectsLayer,
  }),
)
// @ts-expect-error An erased update Source cannot authenticate against init's graph.
CounterDefinition.makeBlock(
  Effect.succeed({ children: [], init, update: erasedUpdateSource, view }),
)
// @ts-expect-error An erased view Source cannot authenticate against init's graph.
CounterDefinition.makeBlock(
  Effect.succeed({ children: [], init, update, view: erasedViewSource }),
)
CounterDefinition.makeBlock(
  // @ts-expect-error An unknown update Source cannot authenticate against init's graph.
  Effect.succeed({ children: [], init, update: unknownUpdateSource, view }),
)
CounterDefinition.makeBlock(
  // @ts-expect-error An unknown view Source cannot authenticate against init's graph.
  Effect.succeed({ children: [], init, update, view: unknownViewSource }),
)
// @ts-expect-error An erased init Source cannot establish the constructor's owner and graph.
CounterDefinition.makeBlock(
  Effect.succeed({ children: [], init: erasedInitSource, update, view }),
)
CounterDefinition.makeBlock(
  // @ts-expect-error An unknown init Source cannot establish the constructor's owner and graph.
  Effect.succeed({ children: [], init: unknownInitSource, update, view }),
)
// @ts-expect-error Each conditional constructor branch must retain its own init/update pair.
CounterDefinition.makeBlock(Effect.succeed(crossed))

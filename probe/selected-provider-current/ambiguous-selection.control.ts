import type { Layer } from 'effect'

import type {
  SelectedLayeredRoot,
  RootRequirements,
  ValidateSelectedLayer,
} from '../../packages/foldkit/dist/runtime/rootBlock.js'
import type { SelectionCases } from './selection-contracts.emitted.js'

type Assert<Condition extends true> = Condition
type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
type Combined = Layer.Layer<
  Layer.Success<SelectionCases['LayerA'] | SelectionCases['LayerB']>
>
type AcceptedPair = Assert<
  Equal<ValidateSelectedLayer<SelectionCases['Block'], Combined>, unknown>
>
type ExactSelectedRequirements = Assert<
  Equal<
    RootRequirements<SelectedLayeredRoot<SelectionCases['Block'], Combined>>,
    RootRequirements<
      SelectedLayeredRoot<SelectionCases['Block'], SelectionCases['LayerA']>
    >
  >
>

export type AmbiguousSelectionControl = readonly [
  AcceptedPair,
  ExactSelectedRequirements,
]

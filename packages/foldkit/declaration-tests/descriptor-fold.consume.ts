import { connectedFold, contextFold } from './descriptor-fold.accepted.js'
import type {
  CallableParity,
  PolicySpecParity,
  ResidualParity,
} from './descriptor-fold.accepted.js'
import { ChildOutMessage, Model } from './outmessage-fold.accepted.js'

export type Inference = readonly [
  CallableParity,
  ResidualParity,
  PolicySpecParity,
]

// @ts-expect-error The emitted helper preserves the required full child lifter and previous Model context.
export const missingContext = contextFold(
  ChildOutMessage.Chose({ value: 'Pear' }),
)

declare const model: typeof Model.Type
const chooseConnected = connectedFold(ChildOutMessage.Chose({ value: 'Pear' }))
// @ts-expect-error The emitted connected Step retains its original graph capability requirement.
export const missingGraph = chooseConnected(model)

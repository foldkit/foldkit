import { type ChangedUrlStep, Navigation } from 'foldkit/scene'

import {
  callbackScene,
  canonicalScene,
  combinedScene,
  explicitOutMessageScene,
  explicitSubscriptionScene,
} from './scene-routing.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export const changedUrlStep = Navigation.changedUrl('/?q=foldkit#results')
export type ExactStep = Expect<Equal<typeof changedUrlStep, ChangedUrlStep>>
export const runRoutedScenes = () => {
  canonicalScene()
  callbackScene()
  combinedScene()
  explicitSubscriptionScene()
  explicitOutMessageScene()
}

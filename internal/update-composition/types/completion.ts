import { Effect } from 'effect'

import { ApplicationComposition, ApplicationDefinition } from './domain.js'
import { focusedBundle, inputCases, jointUpdate } from './parts.js'

export const init = ApplicationComposition.makeInit(() => ({
  model: { count: 0, label: 'Initial' },
}))

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    return { children: [], init, update: jointUpdate }
  }),
)

// @ts-expect-error A sparse stage is not a completed executable update plan.
ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    return { children: [], init, update: inputCases }
  }),
)

// @ts-expect-error A zero-anchor bundle is not a completed executable update plan.
ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    return { children: [], init, update: focusedBundle }
  }),
)

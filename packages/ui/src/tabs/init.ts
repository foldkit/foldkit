import { Option } from 'effect'

import type { InitConfig } from './types.js'

/** @internal Initializes focus and activation state; the parent owns selection. */
export const init = ({ id, activationMode }: InitConfig) => ({
  model: {
    id,
    maybeFocusedIndex: Option.none<number>(),
    activationMode: activationMode ?? 'Automatic',
  },
})

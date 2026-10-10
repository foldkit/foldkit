import { Layer } from 'effect'

import * as UI from '@foldkit/ui'

import { Toast } from './toast'

export const EffectsLayer = Layer.mergeAll(UI.EffectsLayer, Toast.EffectsLayer)

export const mounts = UI.mounts

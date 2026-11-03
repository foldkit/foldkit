import { Effect, Layer } from 'effect'

import { layer as DragAndDropLayer } from '@foldkit/ui/dragAndDrop'

import { EffectsLayer } from './command'
import { DragAndDropBinding } from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const dragAndDrop = yield* DragAndDropBinding
    return { children: [dragAndDrop], init, update, view, EffectsLayer }
  }),
).provide(Layer.mergeAll(DragAndDropLayer))

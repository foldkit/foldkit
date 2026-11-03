import { Effect } from 'effect'

import { Products } from './blocks'
import { EffectsLayer } from './command'
import { ProductsPageBinding } from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const products = yield* ProductsPageBinding

    return { children: [products], init, update, view, EffectsLayer }
  }),
).provide(Products.layer)

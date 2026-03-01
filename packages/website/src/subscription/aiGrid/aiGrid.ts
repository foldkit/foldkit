import { Effect, Stream } from 'effect'
import { Command } from 'foldkit/command'
import type { Subscription } from 'foldkit/subscription'

import type { Message, Model, SubscriptionDeps } from '../../main'
import {
  AI_GRID_CANVAS_ID,
  HERO_GRID_CANVAS_ID,
} from '../../page/landing'
import { startAnimation } from './startAnimation'

const CANVAS_IDS = [HERO_GRID_CANVAS_ID, AI_GRID_CANVAS_ID]

export const aiGrid: Subscription<
  Model,
  Message,
  SubscriptionDeps['aiGrid']
> = {
  modelToDependencies: (model: Model) => ({
    isLandingPage: model.route._tag === 'Home',
  }),
  depsToStream: ({ isLandingPage }) =>
    Stream.when(
      Stream.async<Command<Message>>(() => {
        const cleanups = CANVAS_IDS.map(id => {
          const canvas = document.getElementById(id)

          if (canvas instanceof HTMLCanvasElement) {
            return startAnimation(canvas)
          }
        })

        return Effect.sync(() => {
          cleanups.forEach(cleanup => cleanup?.())
        })
      }),
      () => isLandingPage,
    ),
}

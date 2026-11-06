import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import {
  ApplicationBlock,
  GenerateBall,
  Message,
  type Model,
  layer,
} from './block'

const emptyModel: Model = {
  balls: [],
  nextId: 0,
  isRunning: true,
}

const populatedModel: Model = modifyFields(emptyModel, {
  balls: () => [
    { id: 0, x: 100, y: 100, vx: 50, vy: 50, radius: 10, color: '#ff2d55' },
    { id: 1, x: 200, y: 200, vx: -50, vy: -50, radius: 15, color: '#5ac8fa' },
  ],
  nextId: () => 2,
})

describe('update', () => {
  describe('spawning balls', () => {
    it.effect(
      'ClickedCanvas fires GenerateBall with the click coordinates',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(emptyModel),
          Story.message(Message.ClickedCanvas({ x: 150, y: 200 })),
          Story.Command.expectHas(GenerateBall),
          Story.Command.resolve(
            GenerateBall,
            Message.CompletedGenerateBall({
              x: 150,
              y: 200,
              vx: 10,
              vy: -10,
              radius: 12,
              color: '#ff2d55',
            }),
          ),
          Story.model(model => {
            expect(model.balls).toHaveLength(1)
            expect(model.balls[0]).toMatchObject({
              id: 0,
              x: 150,
              y: 200,
              radius: 12,
              color: '#ff2d55',
            })
            expect(model.nextId).toBe(1)
          }),
        ),
    )

    it.effect(
      'CompletedGenerateBall increments nextId for each ball added',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(emptyModel),
          Story.message(
            Message.CompletedGenerateBall({
              x: 10,
              y: 10,
              vx: 0,
              vy: 0,
              radius: 8,
              color: '#fff',
            }),
          ),
          Story.message(
            Message.CompletedGenerateBall({
              x: 20,
              y: 20,
              vx: 0,
              vy: 0,
              radius: 8,
              color: '#fff',
            }),
          ),
          Story.model(model => {
            expect(model.balls.map(({ id }) => id)).toEqual([0, 1])
            expect(model.nextId).toBe(2)
          }),
        ),
    )
  })

  describe('TickedFrame', () => {
    it.effect('advances ball positions based on velocity and delta time', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(populatedModel),
        Story.message(Message.TickedFrame({ deltaTime: 1000 })),
        Story.model(model => {
          expect(model.balls[0]?.x).toBe(150)
          expect(model.balls[0]?.y).toBe(150)
        }),
      ),
    )

    it.effect(
      'bounces a ball off the canvas edges, flipping its velocity',
      () => {
        const movingRightModel: Model = modifyFields(emptyModel, {
          balls: () => [
            {
              id: 0,
              x: 595,
              y: 200,
              vx: 100,
              vy: 0,
              radius: 10,
              color: '#fff',
            },
          ],
          nextId: () => 1,
        })

        return Story.story(
          { block: ApplicationBlock, layer },
          Story.given(movingRightModel),
          Story.message(Message.TickedFrame({ deltaTime: 1000 })),
          Story.model(model => {
            expect(model.balls[0]?.vx).toBe(-100)
            expect(model.balls[0]?.x).toBe(590)
          }),
        )
      },
    )
  })

  describe('controls', () => {
    it.effect('ClickedClear empties the balls list', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(populatedModel),
        Story.message(Message.ClickedClear()),
        Story.model(model => {
          expect(model.balls).toHaveLength(0)
        }),
      ),
    )

    it.effect('ClickedTogglePlay flips the isRunning flag', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(emptyModel),
        Story.message(Message.ClickedTogglePlay()),
        Story.model(model => {
          expect(model.isRunning).toBe(false)
        }),
        Story.message(Message.ClickedTogglePlay()),
        Story.model(model => {
          expect(model.isRunning).toBe(true)
        }),
      ),
    )
  })
})

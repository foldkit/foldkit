import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  ClickedCanvas,
  ClickedClear,
  ClickedTogglePlay,
  type Model,
  SpawnBall,
  SpawnedBall,
  TickedFrame,
  update,
} from './main'

const emptyModel: Model = {
  balls: [],
  nextId: 0,
  isRunning: true,
}

const populatedModel: Model = {
  ...emptyModel,
  balls: [
    { id: 0, x: 100, y: 100, vx: 50, vy: 50, radius: 10, color: '#ff2d55' },
    { id: 1, x: 200, y: 200, vx: -50, vy: -50, radius: 15, color: '#5ac8fa' },
  ],
  nextId: 2,
}

describe('update', () => {
  describe('spawning balls', () => {
    test('ClickedCanvas fires SpawnBall with the click coordinates', () => {
      Story.story(
        update,
        Story.with(emptyModel),
        Story.message(ClickedCanvas({ x: 150, y: 200 })),
        Story.Command.expectHas(SpawnBall),
        Story.Command.resolve(
          SpawnBall,
          SpawnedBall({
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
      )
    })

    test('SpawnedBall increments nextId for each ball added', () => {
      Story.story(
        update,
        Story.with(emptyModel),
        Story.message(
          SpawnedBall({
            x: 10,
            y: 10,
            vx: 0,
            vy: 0,
            radius: 8,
            color: '#fff',
          }),
        ),
        Story.message(
          SpawnedBall({
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
      )
    })
  })

  describe('TickedFrame', () => {
    test('advances ball positions based on velocity and delta time', () => {
      Story.story(
        update,
        Story.with(populatedModel),
        Story.message(TickedFrame({ deltaTime: 1000 })),
        Story.model(model => {
          expect(model.balls[0]?.x).toBe(150)
          expect(model.balls[0]?.y).toBe(150)
        }),
      )
    })

    test('bounces a ball off the canvas edges, flipping its velocity', () => {
      const movingRightModel: Model = {
        ...emptyModel,
        balls: [
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
        nextId: 1,
      }

      Story.story(
        update,
        Story.with(movingRightModel),
        Story.message(TickedFrame({ deltaTime: 1000 })),
        Story.model(model => {
          expect(model.balls[0]?.vx).toBe(-100)
          expect(model.balls[0]?.x).toBe(590)
        }),
      )
    })
  })

  describe('controls', () => {
    test('ClickedClear empties the balls list', () => {
      Story.story(
        update,
        Story.with(populatedModel),
        Story.message(ClickedClear()),
        Story.model(model => {
          expect(model.balls).toHaveLength(0)
        }),
      )
    })

    test('ClickedTogglePlay flips the isRunning flag', () => {
      Story.story(
        update,
        Story.with(emptyModel),
        Story.message(ClickedTogglePlay()),
        Story.model(model => {
          expect(model.isRunning).toBe(false)
        }),
        Story.message(ClickedTogglePlay()),
        Story.model(model => {
          expect(model.isRunning).toBe(true)
        }),
      )
    })
  })
})

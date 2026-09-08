import { Command, given, message, model, story } from 'foldkit/story'
import { evo } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import { GenerateBall, Message, type Model, update } from './main'

const emptyModel: Model = {
  balls: [],
  nextId: 0,
  isRunning: true,
}

const populatedModel: Model = evo(emptyModel, {
  balls: () => [
    { id: 0, x: 100, y: 100, vx: 50, vy: 50, radius: 10, color: '#ff2d55' },
    { id: 1, x: 200, y: 200, vx: -50, vy: -50, radius: 15, color: '#5ac8fa' },
  ],
  nextId: () => 2,
})

describe('update', () => {
  describe('spawning balls', () => {
    test('ClickedCanvas fires GenerateBall with the click coordinates', () => {
      story(
        update,
        given(emptyModel),
        message(Message.ClickedCanvas({ x: 150, y: 200 })),
        Command.expectHas(GenerateBall),
        Command.resolve(
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
        model(model => {
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

    test('CompletedGenerateBall increments nextId for each ball added', () => {
      story(
        update,
        given(emptyModel),
        message(
          Message.CompletedGenerateBall({
            x: 10,
            y: 10,
            vx: 0,
            vy: 0,
            radius: 8,
            color: '#fff',
          }),
        ),
        message(
          Message.CompletedGenerateBall({
            x: 20,
            y: 20,
            vx: 0,
            vy: 0,
            radius: 8,
            color: '#fff',
          }),
        ),
        model(model => {
          expect(model.balls.map(({ id }) => id)).toEqual([0, 1])
          expect(model.nextId).toBe(2)
        }),
      )
    })
  })

  describe('TickedFrame', () => {
    test('advances ball positions based on velocity and delta time', () => {
      story(
        update,
        given(populatedModel),
        message(Message.TickedFrame({ deltaTime: 1000 })),
        model(model => {
          expect(model.balls[0]?.x).toBe(150)
          expect(model.balls[0]?.y).toBe(150)
        }),
      )
    })

    test('bounces a ball off the canvas edges, flipping its velocity', () => {
      const movingRightModel: Model = evo(emptyModel, {
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

      story(
        update,
        given(movingRightModel),
        message(Message.TickedFrame({ deltaTime: 1000 })),
        model(model => {
          expect(model.balls[0]?.vx).toBe(-100)
          expect(model.balls[0]?.x).toBe(590)
        }),
      )
    })
  })

  describe('controls', () => {
    test('ClickedClear empties the balls list', () => {
      story(
        update,
        given(populatedModel),
        message(Message.ClickedClear()),
        model(model => {
          expect(model.balls).toHaveLength(0)
        }),
      )
    })

    test('ClickedTogglePlay flips the isRunning flag', () => {
      story(
        update,
        given(emptyModel),
        message(Message.ClickedTogglePlay()),
        model(model => {
          expect(model.isRunning).toBe(false)
        }),
        message(Message.ClickedTogglePlay()),
        model(model => {
          expect(model.isRunning).toBe(true)
        }),
      )
    })
  })
})

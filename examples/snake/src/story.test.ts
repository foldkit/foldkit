import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import { Snake } from './domain'
import {
  GenerateApplePosition,
  GeneratedApplePosition,
  type Model,
  PressedKey,
  TickedClock,
  update,
} from './main'

const initialSnake = Snake.create({ x: 10, y: 10 })

const playingModel: Model = {
  snake: initialSnake,
  apple: { x: 15, y: 15 },
  direction: 'Right',
  nextDirection: 'Right',
  gameState: 'Playing',
  points: 0,
  highScore: 0,
}

const notStartedModel: Model = {
  ...playingModel,
  gameState: 'NotStarted',
}

describe('update', () => {
  describe('movement controls', () => {
    test('arrow key updates nextDirection while playing', () => {
      Story.story(
        update,
        Story.with(playingModel),
        Story.message(PressedKey({ key: 'ArrowUp' })),
        Story.model(model => {
          expect(model.nextDirection).toBe('Up')
        }),
      )
    })

    test('WASD key updates nextDirection while playing', () => {
      Story.story(
        update,
        Story.with(playingModel),
        Story.message(PressedKey({ key: 'a' })),
        Story.model(model => {
          expect(model.nextDirection).toBe('Left')
        }),
      )
    })

    test('arrow keys are ignored while the game is paused', () => {
      Story.story(
        update,
        Story.with({ ...playingModel, gameState: 'Paused' }),
        Story.message(PressedKey({ key: 'ArrowDown' })),
        Story.model(model => {
          expect(model.nextDirection).toBe('Right')
        }),
      )
    })
  })

  describe('space key', () => {
    test('SPACE starts the game from NotStarted', () => {
      Story.story(
        update,
        Story.with(notStartedModel),
        Story.message(PressedKey({ key: ' ' })),
        Story.model(model => {
          expect(model.gameState).toBe('Playing')
        }),
      )
    })

    test('SPACE pauses the game when Playing', () => {
      Story.story(
        update,
        Story.with(playingModel),
        Story.message(PressedKey({ key: ' ' })),
        Story.model(model => {
          expect(model.gameState).toBe('Paused')
        }),
      )
    })

    test('SPACE on GameOver does nothing', () => {
      Story.story(
        update,
        Story.with({ ...playingModel, gameState: 'GameOver' }),
        Story.message(PressedKey({ key: ' ' })),
        Story.model(model => {
          expect(model.gameState).toBe('GameOver')
        }),
      )
    })
  })

  describe('restart', () => {
    test('R fires GenerateApplePosition and resets the snake', () => {
      Story.story(
        update,
        Story.with({ ...playingModel, points: 100 }),
        Story.message(PressedKey({ key: 'r' })),
        Story.model(model => {
          expect(model.gameState).toBe('NotStarted')
          expect(model.points).toBe(0)
          expect(model.direction).toBe('Right')
        }),
        Story.Command.expectHas(GenerateApplePosition),
        Story.Command.resolve(
          GenerateApplePosition,
          GeneratedApplePosition({ position: { x: 5, y: 5 } }),
        ),
        Story.model(model => {
          expect(model.apple).toEqual({ x: 5, y: 5 })
        }),
      )
    })
  })

  describe('TickedClock', () => {
    test('moves the snake one cell while Playing', () => {
      Story.story(
        update,
        Story.with(playingModel),
        Story.message(TickedClock()),
        Story.model(model => {
          expect(model.snake[0]).toEqual({ x: 11, y: 10 })
        }),
      )
    })

    test('does nothing when not Playing', () => {
      Story.story(
        update,
        Story.with(notStartedModel),
        Story.message(TickedClock()),
        Story.model(model => {
          expect(model.snake).toEqual(initialSnake)
        }),
      )
    })

    test('eating an apple grows the snake, adds points, and requests a new apple', () => {
      const aboutToEatModel: Model = {
        ...playingModel,
        apple: { x: 11, y: 10 },
      }
      const lengthBefore = aboutToEatModel.snake.length

      Story.story(
        update,
        Story.with(aboutToEatModel),
        Story.message(TickedClock()),
        Story.Command.expectHas(GenerateApplePosition),
        Story.Command.resolve(
          GenerateApplePosition,
          GeneratedApplePosition({ position: { x: 5, y: 5 } }),
        ),
        Story.model(model => {
          expect(model.snake.length).toBe(lengthBefore + 1)
          expect(model.points).toBe(10)
          expect(model.apple).toEqual({ x: 5, y: 5 })
        }),
      )
    })
  })
})

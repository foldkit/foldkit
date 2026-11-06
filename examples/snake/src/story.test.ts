import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import {
  ApplicationBlock,
  GenerateApplePosition,
  Message,
  type Model,
  layer,
} from './block'
import { Snake } from './domain'

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

const notStartedModel: Model = modifyFields(playingModel, {
  gameState: () => 'NotStarted',
})

describe('update', () => {
  describe('movement controls', () => {
    it.effect('arrow key updates nextDirection while playing', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(playingModel),
        Story.message(Message.PressedKey({ key: 'ArrowUp' })),
        Story.model(model => {
          expect(model.nextDirection).toBe('Up')
        }),
      ),
    )

    it.effect('WASD key updates nextDirection while playing', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(playingModel),
        Story.message(Message.PressedKey({ key: 'a' })),
        Story.model(model => {
          expect(model.nextDirection).toBe('Left')
        }),
      ),
    )

    it.effect('arrow keys are ignored while the game is paused', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(modifyFields(playingModel, { gameState: () => 'Paused' })),
        Story.message(Message.PressedKey({ key: 'ArrowDown' })),
        Story.model(model => {
          expect(model.nextDirection).toBe('Right')
        }),
      ),
    )
  })

  describe('space key', () => {
    it.effect('SPACE starts the game from NotStarted', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(notStartedModel),
        Story.message(Message.PressedKey({ key: ' ' })),
        Story.model(model => {
          expect(model.gameState).toBe('Playing')
        }),
      ),
    )

    it.effect('SPACE pauses the game when Playing', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(playingModel),
        Story.message(Message.PressedKey({ key: ' ' })),
        Story.model(model => {
          expect(model.gameState).toBe('Paused')
        }),
      ),
    )

    it.effect('SPACE on GameOver does nothing', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(
          modifyFields(playingModel, { gameState: () => 'GameOver' }),
        ),
        Story.message(Message.PressedKey({ key: ' ' })),
        Story.model(model => {
          expect(model.gameState).toBe('GameOver')
        }),
      ),
    )
  })

  describe('restart', () => {
    it.effect('R fires GenerateApplePosition and resets the snake', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(modifyFields(playingModel, { points: () => 100 })),
        Story.message(Message.PressedKey({ key: 'r' })),
        Story.model(model => {
          expect(model.gameState).toBe('NotStarted')
          expect(model.points).toBe(0)
          expect(model.direction).toBe('Right')
        }),
        Story.Command.expectHas(GenerateApplePosition),
        Story.Command.resolve(
          GenerateApplePosition,
          Message.CompletedGenerateApplePosition({
            position: { x: 5, y: 5 },
          }),
        ),
        Story.model(model => {
          expect(model.apple).toEqual({ x: 5, y: 5 })
        }),
      ),
    )
  })

  describe('TickedClock', () => {
    it.effect('moves the snake one cell while Playing', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(playingModel),
        Story.message(Message.TickedClock()),
        Story.model(model => {
          expect(model.snake[0]).toEqual({ x: 11, y: 10 })
        }),
      ),
    )

    it.effect('does nothing when not Playing', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(notStartedModel),
        Story.message(Message.TickedClock()),
        Story.model(model => {
          expect(model.snake).toEqual(initialSnake)
        }),
      ),
    )

    it.effect(
      'eating an apple grows the snake, adds points, and requests a new apple',
      () => {
        const aboutToEatModel: Model = modifyFields(playingModel, {
          apple: () => ({ x: 11, y: 10 }),
        })
        const lengthBefore = aboutToEatModel.snake.length

        return Story.story(
          { block: ApplicationBlock, layer },
          Story.given(aboutToEatModel),
          Story.message(Message.TickedClock()),
          Story.Command.expectHas(GenerateApplePosition),
          Story.Command.resolve(
            GenerateApplePosition,
            Message.CompletedGenerateApplePosition({
              position: { x: 5, y: 5 },
            }),
          ),
          Story.model(model => {
            expect(model.snake.length).toBe(lengthBefore + 1)
            expect(model.points).toBe(10)
            expect(model.apple).toEqual({ x: 5, y: 5 })
          }),
        )
      },
    )
  })
})

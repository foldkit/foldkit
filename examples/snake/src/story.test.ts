import { Array, Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'

import {
  ApplicationLive,
  GenerateApplePosition,
  Message,
  type Model,
  createSnake,
} from './application'

const initialSnake = createSnake({ x: 10, y: 10 })

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
      story(
        ApplicationLive,
        given(playingModel),
        message(Message.PressedKey({ key: 'ArrowUp' })),
        model(model => {
          expect(model.nextDirection).toBe('Up')
        }),
      ),
    )

    it.effect('WASD key updates nextDirection while playing', () =>
      story(
        ApplicationLive,
        given(playingModel),
        message(Message.PressedKey({ key: 'a' })),
        model(model => {
          expect(model.nextDirection).toBe('Left')
        }),
      ),
    )

    it.effect('arrow keys are ignored while the game is paused', () =>
      story(
        ApplicationLive,
        given(modifyFields(playingModel, { gameState: () => 'Paused' })),
        message(Message.PressedKey({ key: 'ArrowDown' })),
        model(model => {
          expect(model.nextDirection).toBe('Right')
        }),
      ),
    )
  })

  describe('space key', () => {
    it.effect('SPACE starts the game from NotStarted', () =>
      story(
        ApplicationLive,
        given(notStartedModel),
        message(Message.PressedKey({ key: ' ' })),
        model(model => {
          expect(model.gameState).toBe('Playing')
        }),
      ),
    )

    it.effect('SPACE pauses the game when Playing', () =>
      story(
        ApplicationLive,
        given(playingModel),
        message(Message.PressedKey({ key: ' ' })),
        model(model => {
          expect(model.gameState).toBe('Paused')
        }),
      ),
    )

    it.effect('SPACE on GameOver does nothing', () =>
      story(
        ApplicationLive,
        given(modifyFields(playingModel, { gameState: () => 'GameOver' })),
        message(Message.PressedKey({ key: ' ' })),
        model(model => {
          expect(model.gameState).toBe('GameOver')
        }),
      ),
    )
  })

  describe('restart', () => {
    it.effect('R fires GenerateApplePosition and resets the snake', () =>
      story(
        ApplicationLive,
        given(modifyFields(playingModel, { points: () => 100 })),
        message(Message.PressedKey({ key: 'r' })),
        model(model => {
          expect(model.gameState).toBe('NotStarted')
          expect(model.points).toBe(0)
          expect(model.direction).toBe('Right')
        }),
        Command.expectHas(GenerateApplePosition),
        Command.resolve(
          GenerateApplePosition,
          Message.CompletedGenerateApplePosition({ position: { x: 5, y: 5 } }),
        ),
        model(model => {
          expect(model.apple).toEqual({ x: 5, y: 5 })
        }),
      ),
    )
  })

  describe('TickedClock', () => {
    it.effect('moves the snake one cell while Playing', () =>
      story(
        ApplicationLive,
        given(playingModel),
        message(Message.TickedClock()),
        model(model => {
          expect(Array.head(model.snake)).toEqual(Option.some({ x: 11, y: 10 }))
        }),
      ),
    )

    it.effect('does nothing when not Playing', () =>
      story(
        ApplicationLive,
        given(notStartedModel),
        message(Message.TickedClock()),
        model(model => {
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

        return story(
          ApplicationLive,
          given(aboutToEatModel),
          message(Message.TickedClock()),
          Command.expectHas(GenerateApplePosition),
          Command.resolve(
            GenerateApplePosition,
            Message.CompletedGenerateApplePosition({
              position: { x: 5, y: 5 },
            }),
          ),
          model(model => {
            expect(model.snake.length).toBe(lengthBefore + 1)
            expect(model.points).toBe(10)
            expect(model.apple).toEqual({ x: 5, y: 5 })
          }),
        )
      },
    )
  })
})

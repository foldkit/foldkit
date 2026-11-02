import { expect, given, role, scene, text } from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import { ApplicationLive, type Model, createSnake } from './application'

const baseModel: Model = {
  snake: createSnake({ x: 10, y: 10 }),
  apple: { x: 15, y: 15 },
  direction: 'Right',
  nextDirection: 'Right',
  gameState: 'NotStarted',
  points: 0,
  highScore: 0,
}

describe('view', () => {
  it.effect('initial view shows the heading, score, and start prompt', () =>
    scene(
      ApplicationLive,
      given(baseModel),
      expect(role('heading', { name: 'Snake Game' })).toExist(),
      expect(text('Score: 0')).toExist(),
      expect(text('High Score: 0')).toExist(),
      expect(text('Press SPACE to start')).toExist(),
    ),
  )

  it.effect('renders the keyboard instructions', () =>
    scene(
      ApplicationLive,
      given(baseModel),
      expect(text('Use ARROW KEYS or WASD to move')).toExist(),
      expect(text('SPACE to pause/start')).toExist(),
      expect(text('R to restart')).toExist(),
    ),
  )

  it.effect('shows the playing prompt while the game is active', () =>
    scene(
      ApplicationLive,
      given(modifyFields(baseModel, { gameState: () => 'Playing' })),
      expect(text('Playing - SPACE to pause')).toExist(),
    ),
  )

  it.effect('shows the paused prompt while the game is paused', () =>
    scene(
      ApplicationLive,
      given(modifyFields(baseModel, { gameState: () => 'Paused' })),
      expect(text('Paused - SPACE to continue')).toExist(),
    ),
  )

  it.effect('shows the game-over prompt at the end of a run', () =>
    scene(
      ApplicationLive,
      given(
        modifyFields(baseModel, {
          gameState: () => 'GameOver',
          points: () => 50,
        }),
      ),
      expect(text('Game Over - Press R to restart')).toExist(),
      expect(text('Score: 50')).toExist(),
    ),
  )

  it.effect('the current and high scores reflect the Model', () =>
    scene(
      ApplicationLive,
      given(
        modifyFields(baseModel, {
          gameState: () => 'Playing',
          points: () => 120,
          highScore: () => 200,
        }),
      ),
      expect(text('Score: 120')).toExist(),
      expect(text('High Score: 200')).toExist(),
    ),
  )
})

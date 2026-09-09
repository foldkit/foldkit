import { expect, given, role, scene, text } from 'foldkit/scene'
import { evo } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { Snake } from './domain'
import { type Model, update, view } from './main'

const baseModel: Model = {
  snake: Snake.create({ x: 10, y: 10 }),
  apple: { x: 15, y: 15 },
  direction: 'Right',
  nextDirection: 'Right',
  gameState: 'NotStarted',
  points: 0,
  highScore: 0,
}

describe('view', () => {
  test('initial view shows the heading, score, and start prompt', () => {
    scene(
      { update, view },
      given(baseModel),
      expect(role('heading', { name: 'Snake Game' })).toExist(),
      expect(text('Score: 0')).toExist(),
      expect(text('High Score: 0')).toExist(),
      expect(text('Press SPACE to start')).toExist(),
    )
  })

  test('renders the keyboard instructions', () => {
    scene(
      { update, view },
      given(baseModel),
      expect(text('Use ARROW KEYS or WASD to move')).toExist(),
      expect(text('SPACE to pause/start')).toExist(),
      expect(text('R to restart')).toExist(),
    )
  })

  test('shows the playing prompt while the game is active', () => {
    scene(
      { update, view },
      given(evo(baseModel, { gameState: () => 'Playing' })),
      expect(text('Playing - SPACE to pause')).toExist(),
    )
  })

  test('shows the paused prompt while the game is paused', () => {
    scene(
      { update, view },
      given(evo(baseModel, { gameState: () => 'Paused' })),
      expect(text('Paused - SPACE to continue')).toExist(),
    )
  })

  test('shows the game-over prompt at the end of a run', () => {
    scene(
      { update, view },
      given(evo(baseModel, { gameState: () => 'GameOver', points: () => 50 })),
      expect(text('Game Over - Press R to restart')).toExist(),
      expect(text('Score: 50')).toExist(),
    )
  })

  test('the current and high scores reflect the Model', () => {
    scene(
      { update, view },
      given(
        evo(baseModel, {
          gameState: () => 'Playing',
          points: () => 120,
          highScore: () => 200,
        }),
      ),
      expect(text('Score: 120')).toExist(),
      expect(text('High Score: 200')).toExist(),
    )
  })
})

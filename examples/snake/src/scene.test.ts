import { Scene } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, type Model, layer } from './block'
import { Snake } from './domain'

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
  it.effect('initial view shows the heading, score, and start prompt', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(baseModel),
      Scene.expect(Scene.role('heading', { name: 'Snake Game' })).toExist(),
      Scene.expect(Scene.text('Score: 0')).toExist(),
      Scene.expect(Scene.text('High Score: 0')).toExist(),
      Scene.expect(Scene.text('Press SPACE to start')).toExist(),
    ),
  )

  it.effect('renders the keyboard instructions', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(baseModel),
      Scene.expect(Scene.text('Use ARROW KEYS or WASD to move')).toExist(),
      Scene.expect(Scene.text('SPACE to pause/start')).toExist(),
      Scene.expect(Scene.text('R to restart')).toExist(),
    ),
  )

  it.effect('shows the playing prompt while the game is active', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(modifyFields(baseModel, { gameState: () => 'Playing' })),
      Scene.expect(Scene.text('Playing - SPACE to pause')).toExist(),
    ),
  )

  it.effect('shows the paused prompt while the game is paused', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(modifyFields(baseModel, { gameState: () => 'Paused' })),
      Scene.expect(Scene.text('Paused - SPACE to continue')).toExist(),
    ),
  )

  it.effect('shows the game-over prompt at the end of a run', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(
        modifyFields(baseModel, {
          gameState: () => 'GameOver',
          points: () => 50,
        }),
      ),
      Scene.expect(Scene.text('Game Over - Press R to restart')).toExist(),
      Scene.expect(Scene.text('Score: 50')).toExist(),
    ),
  )

  it.effect('the current and high scores reflect the Model', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(
        modifyFields(baseModel, {
          gameState: () => 'Playing',
          points: () => 120,
          highScore: () => 200,
        }),
      ),
      Scene.expect(Scene.text('Score: 120')).toExist(),
      Scene.expect(Scene.text('High Score: 200')).toExist(),
    ),
  )
})

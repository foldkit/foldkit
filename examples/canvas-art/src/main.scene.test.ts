import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { type Model, update, view } from './main'

const emptyModel: Model = {
  balls: [],
  nextId: 0,
  isRunning: true,
}

describe('scene', () => {
  test('initial view shows the heading, prompt, and Pause + Clear controls', () => {
    Scene.scene(
      { update, view },
      Scene.with(emptyModel),
      Scene.expect(Scene.role('heading', { name: 'Canvas Art' })).toExist(),
      Scene.expect(Scene.text('Click the canvas to spawn a ball.')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Pause' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Clear' })).toExist(),
      Scene.expect(Scene.text('0 balls')).toExist(),
    )
  })

  test('Pause toggles to Play when the simulation is stopped', () => {
    Scene.scene(
      { update, view },
      Scene.with(emptyModel),
      Scene.click(Scene.role('button', { name: 'Pause' })),
      Scene.expect(Scene.role('button', { name: 'Play' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Pause' })).toBeAbsent(),
    )
  })

  test('the ball count reflects spawned balls in the Model', () => {
    const populatedModel: Model = {
      ...emptyModel,
      balls: [
        { id: 0, x: 10, y: 20, vx: 1, vy: 1, radius: 8, color: '#ff2d55' },
        { id: 1, x: 30, y: 40, vx: -1, vy: 1, radius: 12, color: '#5ac8fa' },
        { id: 2, x: 50, y: 60, vx: 1, vy: -1, radius: 16, color: '#34c759' },
      ],
      nextId: 3,
    }

    Scene.scene(
      { update, view },
      Scene.with(populatedModel),
      Scene.expect(Scene.text('3 balls')).toExist(),
    )
  })

  test('Clear empties the rendered ball count', () => {
    const populatedModel: Model = {
      ...emptyModel,
      balls: [
        { id: 0, x: 10, y: 20, vx: 1, vy: 1, radius: 8, color: '#ff2d55' },
      ],
      nextId: 1,
    }

    Scene.scene(
      { update, view },
      Scene.with(populatedModel),
      Scene.expect(Scene.text('1 balls')).toExist(),
      Scene.click(Scene.role('button', { name: 'Clear' })),
      Scene.expect(Scene.text('0 balls')).toExist(),
    )
  })
})

import { Option } from 'effect'
import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import {
  Compute,
  ComputedSquare,
  EngineOff,
  EngineReady,
  type Model,
  update,
  view,
} from './main'

const offModel: Model = {
  engine: EngineOff(),
  computeCount: 0,
  lastResult: Option.none(),
}

const readyModel: Model = {
  engine: EngineReady({ engineId: 'engine-1' }),
  computeCount: 2,
  lastResult: Option.none(),
}

describe('view', () => {
  test('initial view shows the engine off with a Start button', () => {
    Scene.scene(
      { update, view },
      Scene.with(offModel),
      Scene.expect(Scene.text('Engine is off.')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Start engine' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Stop engine' })).toBeAbsent(),
      Scene.expect(Scene.text('No result yet.')).toExist(),
    )
  })

  test('clicking Start engine enters the booting state and shows Stop', () => {
    Scene.scene(
      { update, view },
      Scene.with(offModel),
      Scene.click(Scene.role('button', { name: 'Start engine' })),
      Scene.expect(Scene.text('Booting engine...')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Stop engine' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Start engine' })).toBeAbsent(),
    )
  })

  test('a ready engine shows its id and the Stop button', () => {
    Scene.scene(
      { update, view },
      Scene.with(readyModel),
      Scene.expect(Scene.text('Engine ready: engine-1')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Stop engine' })).toExist(),
    )
  })

  test('clicking Compute fires the Compute command and renders the result', () => {
    Scene.scene(
      { update, view },
      Scene.with(readyModel),
      Scene.click(Scene.role('button', { name: 'Compute next square' })),
      Scene.Command.expectExact(Compute({ value: 3 })),
      Scene.Command.resolve(Compute, ComputedSquare({ result: 9 })),
      Scene.expect(Scene.text('Last result: 9')).toExist(),
    )
  })
})

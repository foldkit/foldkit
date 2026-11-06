import { Effect, Option } from 'effect'
import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { test as baseTest, describe } from 'vitest'

import { Flags } from './flags'
import { createEmptyGrid } from './grid'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import type { Model } from './model'

const GRID_SIZE = 16
const applicationSubject = { block: ApplicationBlock, layer }

const makeBenchmark = (
  application: Story.TestBlock<typeof applicationSubject>,
) => {
  const { update } = application
  const initialModel = modifyFields(
    application.init(Flags.make({ maybeSavedCanvas: Option.none() })).model,
    { grid: () => createEmptyGrid(GRID_SIZE), gridSize: () => GRID_SIZE },
  )

  const dispatch = (
    model: Model,
    ...messages: ReadonlyArray<Parameters<typeof update>[1]>
  ): Model =>
    messages.reduce<Model>(
      (currentModel, message) => update(currentModel, message).model,
      model,
    )

  const buildHistoryModel = (steps: number): Model => {
    let model = initialModel
    for (let i = 0; i < steps; i++) {
      const x = i % GRID_SIZE
      const y = Math.floor(i / GRID_SIZE) % GRID_SIZE
      model = dispatch(
        model,
        Message.PressedCell({ x, y }),
        Message.ReleasedMouse(),
      )
    }
    return model
  }

  const modelWith10Steps = buildHistoryModel(10)
  const modelWith30Steps = buildHistoryModel(30)
  return { initialModel, update, dispatch, modelWith10Steps, modelWith30Steps }
}
const test = baseTest.extend<{ application: ReturnType<typeof makeBenchmark> }>(
  {
    application: async ({}, use) =>
      Effect.runPromise(
        Story.withBlock(applicationSubject, application =>
          Effect.promise(() => use(makeBenchmark(application))),
        ),
      ),
  },
)

describe('update: single operations', () => {
  test('brush stroke (press + release)', async ({
    bench,
    application: { dispatch, initialModel },
  }) => {
    await bench('brush stroke (press + release)', () => {
      dispatch(
        initialModel,
        Message.PressedCell({ x: 5, y: 5 }),
        Message.ReleasedMouse(),
      )
    }).run()
  })

  test('brush drag (5 cells)', async ({
    bench,
    application: { dispatch, initialModel },
  }) => {
    await bench('brush drag (5 cells)', () => {
      dispatch(
        initialModel,
        Message.PressedCell({ x: 0, y: 0 }),
        Message.EnteredCell({ x: 1, y: 0 }),
        Message.EnteredCell({ x: 2, y: 0 }),
        Message.EnteredCell({ x: 3, y: 0 }),
        Message.EnteredCell({ x: 4, y: 0 }),
        Message.ReleasedMouse(),
      )
    }).run()
  })

  test('flood fill (empty grid)', async ({
    bench,
    application: { initialModel, dispatch },
  }) => {
    await bench('flood fill (empty grid)', () => {
      const fillModel: Model = modifyFields(initialModel, {
        tool: () => 'Fill',
      })
      dispatch(fillModel, Message.PressedCell({ x: 0, y: 0 }))
    }).run()
  })
})

describe('update: undo/redo with history', () => {
  test('undo (10 history entries)', async ({
    bench,
    application: { dispatch, modelWith10Steps },
  }) => {
    await bench('undo (10 history entries)', () => {
      dispatch(modelWith10Steps, Message.ClickedUndo())
    }).run()
  })

  test('undo (30 history entries)', async ({
    bench,
    application: { dispatch, modelWith30Steps },
  }) => {
    await bench('undo (30 history entries)', () => {
      dispatch(modelWith30Steps, Message.ClickedUndo())
    }).run()
  })

  test('5x undo then 5x redo', async ({
    bench,
    application: { modelWith10Steps, update },
  }) => {
    await bench('5x undo then 5x redo', () => {
      let model = modelWith10Steps
      for (let i = 0; i < 5; i++) {
        model = update(model, Message.ClickedUndo()).model
      }
      for (let i = 0; i < 5; i++) {
        model = update(model, Message.ClickedRedo()).model
      }
    }).run()
  })
})

describe('update: paint sequence (16x16 grid)', () => {
  test('paint 50 random cells', async ({
    bench,
    application: { initialModel, dispatch },
  }) => {
    await bench('paint 50 random cells', () => {
      let model = initialModel
      for (let i = 0; i < 50; i++) {
        const x = (i * 7 + 3) % GRID_SIZE
        const y = (i * 11 + 5) % GRID_SIZE
        model = dispatch(
          model,
          Message.PressedCell({ x, y }),
          Message.ReleasedMouse(),
        )
      }
    }).run()
  })

  test('paint 50 cells with mirror mode', async ({
    bench,
    application: { initialModel, dispatch },
  }) => {
    await bench('paint 50 cells with mirror mode', () => {
      let model: Model = modifyFields(initialModel, {
        mirrorMode: () => 'Both',
      })
      for (let i = 0; i < 50; i++) {
        const x = (i * 7 + 3) % GRID_SIZE
        const y = (i * 11 + 5) % GRID_SIZE
        model = dispatch(
          model,
          Message.PressedCell({ x, y }),
          Message.ReleasedMouse(),
        )
      }
    }).run()
  })
})

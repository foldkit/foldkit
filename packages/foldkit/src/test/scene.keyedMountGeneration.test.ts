import { Effect, Layer, Schema } from 'effect'
import { expect, test, vi } from 'vitest'

import { it } from '@effect/vitest'

import { Block, Program, Runtime } from '../index.js'
import * as Scene from '../scene/public.js'
import * as Application from './apps/retainedMountDelivery/application.js'
import * as Surface from './apps/retainedMountDelivery/surface.js'

const HostModel = Schema.Struct({
  application: Application.ApplicationBlock.Model,
})
const HostKey = Symbol('RetainedMountGeneration')
const HostBlock = Block.make('RetainedMountGeneration', {
  key: HostKey,
  Model: HostModel,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const ApplicationBinding = HostBlock.makeRequiredFieldBinding(
  Application.ApplicationBlock,
  {
    field: 'application',
    init: { contextToArgs: () => [false] },
  },
).withOutMessagePolicy({
  fold: HostBlock.makeOutMessageFold(Application.ApplicationBlock, {
    MeasuredSurface: () => HostBlock.makeNoopStep(),
  }),
})
const HostComposition = HostBlock.makeComposition({
  bindings: [ApplicationBinding],
})
const layer = HostBlock.makeLayer(
  Effect.gen(function* () {
    const application = yield* ApplicationBinding

    return {
      children: [application],
      init: HostComposition.makeInit(() => ({ model: {} })),
      update: HostComposition.makeUpdate({}),
      view: HostComposition.makeView((model, h) =>
        h.block(
          ApplicationBinding.embedView({
            slotId: 'application',
            model: model.application,
            viewInputs: { form: 'nested' },
          }),
        ),
      ),
    }
  }),
).pipe(Layer.provide(Application.layer))

const firstMount = Surface.ObserveSurface({ label: 'first' })
const recreatedMount = Surface.ObserveSurface({ label: 'recreated' })
const measured = (width: number) => Surface.Message.MeasuredSurface({ width })
const click = (id: string) => Scene.click(Scene.selector(`#${id}`))
const subject = {
  block: Application.ApplicationBlock,
  layer: Application.layer,
}
const acquiredElements = () =>
  Surface.handlerLog.filter(event => event === 'DIV')
const clickElement = (id: string) => {
  const element = document.getElementById(id)

  if (element === null) {
    throw new Error(`Missing control ${id}`)
  }

  element.click()
}

test('Runtime reacquires a marked retained element after same-key replacement in one event', async () => {
  Surface.handlerLog.length = 0
  const container = document.createElement('div')
  container.id = 'retained-mount-generation'
  document.body.append(container)
  const handle = Runtime.embed(
    Program.makeElement({ block: HostBlock, layer, container }),
  )

  try {
    await vi.waitFor(() => expect(acquiredElements()).toHaveLength(1))
    const original = document.getElementById('surface')

    clickElement('replace-marked-in-one-click')

    await vi.waitFor(() =>
      expect(document.getElementById('summary')?.textContent).toBe(
        'second:600:second,first:0:recreated',
      ),
    )
    expect(document.getElementById('surface')).toBe(original)
    await vi.waitFor(() => expect(acquiredElements()).toHaveLength(2))
  } finally {
    await handle.dispose()
    container.remove()
  }
})

it.effect(
  'Scene reacquires a marked retained element after same-key replacement in one event',
  () =>
    Scene.scene(
      { ...subject, viewInputs: { form: 'nested' } },
      Scene.init(false),
      Scene.Mount.resolve(firstMount, measured(100)),
      click('replace-marked-in-one-click'),
      Scene.Mount.expectEnded(firstMount),
      Scene.expect(Scene.selector('#summary')).toHaveText(
        'second:600:second,first:0:recreated',
      ),
      Scene.Mount.expectExact(recreatedMount),
      Scene.Mount.resolve(recreatedMount, measured(200)),
    ),
)

test('Runtime reacquires after an ended owner omits its marker before restoring it', async () => {
  Surface.handlerLog.length = 0
  const container = document.createElement('div')
  container.id = 'retained-mount-generation'
  document.body.append(container)
  const handle = Runtime.embed(
    Program.makeElement({ block: HostBlock, layer, container }),
  )

  try {
    await vi.waitFor(() => expect(acquiredElements()).toHaveLength(1))
    const original = document.getElementById('surface')

    clickElement('second')
    clickElement('remove')
    await vi.waitFor(() =>
      expect(document.getElementById('summary')?.textContent).toBe(
        'second:600:second',
      ),
    )

    clickElement('recreate')
    await vi.waitFor(() =>
      expect(document.getElementById('summary')?.textContent).toBe(
        'second:600:second,first:600:recreated',
      ),
    )

    clickElement('first')
    clickElement('restore')
    await vi.waitFor(() =>
      expect(document.getElementById('summary')?.textContent).toBe(
        'second:600:second,first:0:recreated',
      ),
    )
    expect(document.getElementById('surface')).toBe(original)
    await vi.waitFor(() => expect(acquiredElements()).toHaveLength(2))
  } finally {
    await handle.dispose()
    container.remove()
  }
})

it.effect(
  'Scene retains an acknowledged physical acquisition until the replacement marker appears',
  () =>
    Scene.scene(
      { ...subject, viewInputs: { form: 'nested' } },
      Scene.init(false),
      Scene.Mount.resolve(firstMount, measured(100)),
      click('second'),
      click('remove'),
      Scene.Mount.expectEnded(firstMount),
      click('recreate'),
      click('first'),
      Scene.Mount.expectNone(),
      click('restore'),
      Scene.Mount.expectExact(recreatedMount),
      Scene.Mount.resolve(recreatedMount, measured(200)),
    ),
)

test('Runtime reacquires a retained element for a marked different owner while both remain active', async () => {
  Surface.handlerLog.length = 0
  const container = document.createElement('div')
  container.id = 'retained-mount-generation'
  document.body.append(container)
  const handle = Runtime.embed(
    Program.makeElement({ block: HostBlock, layer, container }),
  )

  try {
    await vi.waitFor(() => expect(acquiredElements()).toHaveLength(1))
    const original = document.getElementById('surface')

    clickElement('second')
    clickElement('restore')

    await vi.waitFor(() =>
      expect(document.getElementById('summary')?.textContent).toBe(
        'first:0:first,second:0:second',
      ),
    )
    expect(document.getElementById('surface')).toBe(original)
    await vi.waitFor(() => expect(acquiredElements()).toHaveLength(2))
  } finally {
    await handle.dispose()
    container.remove()
  }
})

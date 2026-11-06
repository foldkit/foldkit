import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, Model, hexColorPicker, layer } from './block'

const initialModel = Model.make({
  content: 'https://foldkit.dev',
  fillColor: '#1e1b4b',
  backgroundColor: '#fef3c7',
})

describe('view', () => {
  it.effect('initial view shows the page heading and field labels', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.expect(Scene.role('heading', { name: 'QR Designer' })).toExist(),
      Scene.expect(Scene.label('Encoded value')).toExist(),
      Scene.expect(Scene.text('Fill color')).toExist(),
      Scene.expect(Scene.text('Background color')).toExist(),
    ),
  )

  it.effect('the encoded-value input reflects the Model content', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.expect(Scene.label('Encoded value')).toHaveValue(
        'https://foldkit.dev',
      ),
    ),
  )

  it.effect('typing into the input updates the rendered value', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.type(Scene.label('Encoded value'), 'WIFI:S:Net;P:secret;;'),
      Scene.expect(Scene.label('Encoded value')).toHaveValue(
        'WIFI:S:Net;P:secret;;',
      ),
    ),
  )

  it.effect(
    'clicking the first preset swatch updates the fill color hex readout',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(initialModel),
        Scene.expect(Scene.text('#1E1B4B')).toExist(),
        Scene.click(Scene.role('button', { name: 'Use #0f766e' })),
        Scene.expect(Scene.text('#0F766E')).toExist(),
      ),
  )

  it.effect(
    'a color-changed CustomEvent from the fill picker updates the hex readout',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(initialModel),
        Scene.CustomElement.emit(
          hexColorPicker,
          Scene.selector('#fill-color'),
          'color-changed',
          { value: '#ff8800' },
        ),
        Scene.expect(Scene.text('#FF8800')).toExist(),
      ),
  )

  it.effect(
    'a color-changed CustomEvent from the background picker leaves the fill readout alone',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(initialModel),
        Scene.CustomElement.emit(
          hexColorPicker,
          Scene.selector('#background-color'),
          'color-changed',
          { value: '#222222' },
        ),
        Scene.expect(Scene.text('#222222')).toExist(),
        Scene.expect(Scene.text('#1E1B4B')).toExist(),
      ),
  )
})

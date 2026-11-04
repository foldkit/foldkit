import {
  CustomElement,
  click,
  expect,
  given,
  label,
  role,
  scene,
  selector,
  text,
  type,
} from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, Model, hexColorPicker, layer } from './application'

const initialModel = Model.make({
  content: 'https://foldkit.dev',
  fillColor: '#1e1b4b',
  backgroundColor: '#fef3c7',
})

describe('view', () => {
  it.effect('initial view shows the page heading and field labels', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(initialModel),
      expect(role('heading', { name: 'QR Designer' })).toExist(),
      expect(label('Encoded value')).toExist(),
      expect(text('Fill color')).toExist(),
      expect(text('Background color')).toExist(),
    ),
  )

  it.effect('the encoded-value input reflects the Model content', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(initialModel),
      expect(label('Encoded value')).toHaveValue('https://foldkit.dev'),
    ),
  )

  it.effect('typing into the input updates the rendered value', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(initialModel),
      type(label('Encoded value'), 'WIFI:S:Net;P:secret;;'),
      expect(label('Encoded value')).toHaveValue('WIFI:S:Net;P:secret;;'),
    ),
  )

  it.effect(
    'clicking the first preset swatch updates the fill color hex readout',
    () =>
      scene(
        { block: ApplicationBlock, layer },
        given(initialModel),
        expect(text('#1E1B4B')).toExist(),
        click(role('button', { name: 'Use #0f766e' })),
        expect(text('#0F766E')).toExist(),
      ),
  )

  it.effect(
    'a color-changed CustomEvent from the fill picker updates the hex readout',
    () =>
      scene(
        { block: ApplicationBlock, layer },
        given(initialModel),
        CustomElement.emit(
          hexColorPicker,
          selector('#fill-color'),
          'color-changed',
          { value: '#ff8800' },
        ),
        expect(text('#FF8800')).toExist(),
      ),
  )

  it.effect(
    'a color-changed CustomEvent from the background picker leaves the fill readout alone',
    () =>
      scene(
        { block: ApplicationBlock, layer },
        given(initialModel),
        CustomElement.emit(
          hexColorPicker,
          selector('#background-color'),
          'color-changed',
          { value: '#222222' },
        ),
        expect(text('#222222')).toExist(),
        expect(text('#1E1B4B')).toExist(),
      ),
  )
})

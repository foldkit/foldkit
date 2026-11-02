import { Effect } from 'effect'
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
import { describe, test } from 'vitest'

import { ApplicationBlock, Model, hexColorPicker } from './application'

const initialModel = Model.make({
  content: 'https://foldkit.dev',
  fillColor: '#1e1b4b',
  backgroundColor: '#fef3c7',
})

describe('view', () => {
  test('initial view shows the page heading and field labels', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(initialModel),
        expect(role('heading', { name: 'QR Designer' })).toExist(),
        expect(label('Encoded value')).toExist(),
        expect(text('Fill color')).toExist(),
        expect(text('Background color')).toExist(),
      ),
    )
  })

  test('the encoded-value input reflects the Model content', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(initialModel),
        expect(label('Encoded value')).toHaveValue('https://foldkit.dev'),
      ),
    )
  })

  test('typing into the input updates the rendered value', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(initialModel),
        type(label('Encoded value'), 'WIFI:S:Net;P:secret;;'),
        expect(label('Encoded value')).toHaveValue('WIFI:S:Net;P:secret;;'),
      ),
    )
  })

  test('clicking the first preset swatch updates the fill color hex readout', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(initialModel),
        expect(text('#1E1B4B')).toExist(),
        click(role('button', { name: 'Use #0f766e' })),
        expect(text('#0F766E')).toExist(),
      ),
    )
  })

  test('a color-changed CustomEvent from the fill picker updates the hex readout', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
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
  })

  test('a color-changed CustomEvent from the background picker leaves the fill readout alone', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
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
})

import { clsx } from 'clsx'
import { Effect, Schema } from 'effect'
import { Block, CustomElement } from 'foldkit'
import { Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import 'vanilla-colorful/hex-color-picker.js'

import { Button, Input } from '@foldkit/ui'
import '@shoelace-style/shoelace/dist/components/qr-code/qr-code.js'

export const Model = Schema.Struct({
  content: Schema.String,
  fillColor: Schema.String,
  backgroundColor: Schema.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedContent: { value: Schema.String },
  ChangedFillColor: { value: Schema.String },
  ChangedBackgroundColor: { value: Schema.String },
})
export type Message = typeof Message.Type

const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  Model,
  Message,
})

const { makeComposition, makeFieldsStep } = ApplicationBlock

export const ApplicationComposition = makeComposition()
type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>

const DEFAULT_CONTENT = 'https://foldkit.dev'
const DEFAULT_FILL_COLOR = '#1e1b4b'
const DEFAULT_BACKGROUND_COLOR = '#fef3c7'

export const init = ApplicationComposition.makeInit(() => ({
  model: {
    content: DEFAULT_CONTENT,
    fillColor: DEFAULT_FILL_COLOR,
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
  },
}))

export const update = ApplicationComposition.makeUpdate({
  UpdatedContent: makeFieldsStep.fromMessage(({ value }) => ({
    content: () => value,
  })),
  ChangedFillColor: makeFieldsStep.fromMessage(({ value }) => ({
    fillColor: () => value,
  })),
  ChangedBackgroundColor: makeFieldsStep.fromMessage(({ value }) => ({
    backgroundColor: () => value,
  })),
})

export const hexColorPicker = CustomElement.define({
  tag: 'hex-color-picker',
  properties: {
    color: Schema.String,
  },
  events: {
    'color-changed': Schema.Struct({ value: Schema.String }),
  },
})

const qrCode = CustomElement.define({
  tag: 'sl-qr-code',
  properties: {
    value: Schema.String,
    label: Schema.String,
    size: Schema.Number,
    fill: Schema.String,
    background: Schema.String,
    radius: Schema.Number,
  },
  events: {},
})

export const view = ApplicationComposition.makeView((model, h) => ({
  title: 'Foldkit QR Designer',
  body: h.div(
    [
      h.Class(
        'min-h-screen bg-slate-50 text-slate-900 px-6 py-10 flex flex-col items-center',
      ),
    ],
    [
      h.div(
        [h.Class('w-full max-w-3xl flex flex-col gap-8')],
        [
          headerView(h),
          designerView(
            model.content,
            model.fillColor,
            model.backgroundColor,
            h,
          ),
        ],
      ),
    ],
  ),
}))

const codeView = (text: string, h: ApplicationViewBuilder): Html =>
  h.code([h.Class('px-1 py-0.5 rounded bg-slate-200 text-[0.8em]')], [text])

const headerView = (h: ApplicationViewBuilder): Html =>
  h.header(
    [h.Class('flex flex-col gap-2')],
    [
      h.h1([h.Class('text-3xl font-bold tracking-tight')], ['QR Designer']),
      h.p(
        [h.Class('text-sm text-slate-600 leading-relaxed')],
        [
          'Two third-party web components, both bound to Foldkit through ',
          codeView('CustomElement.define', h),
          '. ',
          codeView('<hex-color-picker>', h),
          ' from ',
          codeView('vanilla-colorful', h),
          ' emits ',
          codeView('color-changed', h),
          ' CustomEvents that flow back as Messages. ',
          codeView('<sl-qr-code>', h),
          ' from ',
          codeView('@shoelace-style/shoelace', h),
          ' accepts typed properties (',
          codeView('value', h),
          ', ',
          codeView('fill', h),
          ', ',
          codeView('background', h),
          ', ',
          codeView('size', h),
          ', ',
          codeView('radius', h),
          ') that the runtime diffs through Snabbdom’s propsModule. The pickers and the QR never touch each other directly; they share state through the Model.',
        ],
      ),
    ],
  )

const FIELD_LABEL_CLASS =
  'text-xs font-semibold uppercase tracking-wide text-slate-600'
const FIELD_CONTROL_CLASS =
  'px-3 py-2 text-sm rounded-md border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

const designerView = (
  content: string,
  fillColor: string,
  backgroundColor: string,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [
      h.Class(
        'grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6',
      ),
    ],
    [
      controlsView(content, fillColor, backgroundColor, h),
      previewView(content, fillColor, backgroundColor, h),
    ],
  )

const controlsView = (
  content: string,
  fillColor: string,
  backgroundColor: string,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [h.Class('flex flex-col gap-5')],
    [
      contentFieldView(content, h),
      colorFieldView(
        {
          id: 'fill-color',
          label: 'Fill color',
          value: fillColor,
          onChange: value => Message.ChangedFillColor({ value }),
        },
        h,
      ),
      colorFieldView(
        {
          id: 'background-color',
          label: 'Background color',
          value: backgroundColor,
          onChange: value => Message.ChangedBackgroundColor({ value }),
        },
        h,
      ),
    ],
  )

const contentFieldView = (content: string, h: ApplicationViewBuilder): Html =>
  Input.view(
    {
      id: 'qr-content',
      value: content,
      onInput: value => Message.UpdatedContent({ value }),
      placeholder: 'https://foldkit.dev',
      toView: attributes =>
        h.div(
          [h.Class('flex flex-col gap-1.5')],
          [
            h.label(
              [...attributes.label, h.Class(FIELD_LABEL_CLASS)],
              ['Encoded value'],
            ),
            h.input([...attributes.input, h.Class(FIELD_CONTROL_CLASS)]),
            h.p(
              [h.Class('text-xs text-slate-500')],
              [
                'Anything the QR spec accepts: a URL, plain text, a Wi-Fi config, a payment URI.',
              ],
            ),
          ],
        ),
    },
    h,
  )

const colorFieldView = (
  config: Readonly<{
    id: string
    label: string
    value: string
    onChange: (value: string) => Message
  }>,
  h: ApplicationViewBuilder,
): Html => {
  const colorPicker = hexColorPicker.withMessage(h)

  return h.div(
    [h.Class('flex flex-col gap-1.5')],
    [
      h.label([h.For(config.id), h.Class(FIELD_LABEL_CLASS)], [config.label]),
      h.div(
        [h.Class('flex items-center gap-3')],
        [
          colorPicker([
            colorPicker.Color(config.value),
            colorPicker.OnColorChanged(detail => config.onChange(detail.value)),
            h.Class('w-40 h-40 rounded-md shadow-inner'),
            h.Id(config.id),
          ]),
          h.div(
            [h.Class('flex flex-col gap-1')],
            [
              h.span(
                [h.Class('text-sm font-mono text-slate-800')],
                [config.value.toUpperCase()],
              ),
              swatchRow(config.value, config.onChange, h),
            ],
          ),
        ],
      ),
    ],
  )
}

const PRESET_COLORS: ReadonlyArray<string> = [
  '#1e1b4b',
  '#9d174d',
  '#0f766e',
  '#b45309',
  '#fef3c7',
  '#ffffff',
]

const swatchClass = (isActive: boolean): string =>
  clsx('w-5 h-5 rounded-full cursor-pointer transition', {
    'border-2 border-indigo-600 shadow-sm': isActive,
    'border border-slate-300 hover:border-slate-500': !isActive,
  })

const swatchRow = (
  active: string,
  onChange: (value: string) => Message,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [h.Class('flex flex-wrap gap-1.5 max-w-[10rem]')],
    PRESET_COLORS.map(color =>
      Button.view(
        {
          onClick: onChange(color),
          toView: attributes =>
            h.button([
              ...attributes.button,
              h.Title(color),
              h.AriaLabel(`Use ${color}`),
              h.Class(
                swatchClass(color.toLowerCase() === active.toLowerCase()),
              ),
              h.Style({ backgroundColor: color }),
            ]),
        },
        h,
      ),
    ),
  )

const QR_SIZE = 220

const previewView = (
  content: string,
  fillColor: string,
  backgroundColor: string,
  h: ApplicationViewBuilder,
): Html => {
  const qr = qrCode.withMessage(h)

  return h.div(
    [
      h.Class(
        'flex flex-col items-center gap-3 self-start p-4 rounded-md bg-slate-50 border border-slate-200',
      ),
    ],
    [
      qr([
        qr.Value(content),
        qr.Label(`QR code for ${content}`),
        qr.Size(QR_SIZE),
        qr.Fill(fillColor),
        qr.Background(backgroundColor),
        qr.Radius(0),
      ]),
      h.p(
        [h.Class('text-xs text-slate-500 max-w-[14rem] text-center')],
        [
          'Live ',
          codeView('<sl-qr-code>', h),
          '. Property writes diff through Snabbdom; the canvas redraws when the Model changes.',
        ],
      ),
    ],
  )
}

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
    }
  }),
)

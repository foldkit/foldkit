import '@shoelace-style/shoelace/dist/components/qr-code/qr-code.js'
import { clsx } from 'clsx'
import { Match as M, Schema as S } from 'effect'
import { Command, CustomElement, Runtime, Ui } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'
import 'vanilla-colorful/hex-color-picker.js'

// MODEL

export const Model = S.Struct({
  content: S.String,
  fillColor: S.String,
  backgroundColor: S.String,
})
export type Model = typeof Model.Type

// MESSAGE

export const UpdatedContent = m('UpdatedContent', { value: S.String })
export const ChangedFillColor = m('ChangedFillColor', { value: S.String })
export const ChangedBackgroundColor = m('ChangedBackgroundColor', {
  value: S.String,
})

export const Message = S.Union([
  UpdatedContent,
  ChangedFillColor,
  ChangedBackgroundColor,
])
export type Message = typeof Message.Type

// INIT

const DEFAULT_CONTENT = 'https://foldkit.dev'
const DEFAULT_FILL_COLOR = '#1e1b4b'
const DEFAULT_BACKGROUND_COLOR = '#fef3c7'

export const init: Runtime.ProgramInit<Model, Message> = () => [
  {
    content: DEFAULT_CONTENT,
    fillColor: DEFAULT_FILL_COLOR,
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
  },
  [],
]

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      UpdatedContent: ({ value }) => [evo(model, { content: () => value }), []],
      ChangedFillColor: ({ value }) => [
        evo(model, { fillColor: () => value }),
        [],
      ],
      ChangedBackgroundColor: ({ value }) => [
        evo(model, { backgroundColor: () => value }),
        [],
      ],
    }),
  )

// WEB COMPONENT

const hexColorPicker = CustomElement.define({
  tag: 'hex-color-picker',
  properties: {
    color: S.String,
  },
  events: {
    'color-changed': S.Struct({ value: S.String }),
  },
})

const qrCode = CustomElement.define({
  tag: 'sl-qr-code',
  properties: {
    value: S.String,
    label: S.String,
    size: S.Number,
    fill: S.String,
    background: S.String,
    radius: S.Number,
  },
  events: {},
})

const colorPicker = hexColorPicker.withMessage<Message>()
const qr = qrCode.withMessage<Message>()

// VIEW

export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
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
          [headerView(), designerView(model)],
        ),
      ],
    ),
  }
}

const codeView = (text: string): Html => {
  const h = html<Message>()

  return h.code(
    [h.Class('px-1 py-0.5 rounded bg-slate-200 text-[0.8em]')],
    [text],
  )
}

const headerView = (): Html => {
  const h = html<Message>()

  return h.header(
    [h.Class('flex flex-col gap-2')],
    [
      h.h1([h.Class('text-3xl font-bold tracking-tight')], ['QR Designer']),
      h.p(
        [h.Class('text-sm text-slate-600 leading-relaxed')],
        [
          'Two third-party web components, both bound to Foldkit through ',
          codeView('CustomElement.define'),
          '. ',
          codeView('<hex-color-picker>'),
          ' from ',
          codeView('vanilla-colorful'),
          ' emits ',
          codeView('color-changed'),
          ' CustomEvents that flow back as Messages. ',
          codeView('<sl-qr-code>'),
          ' from ',
          codeView('@shoelace-style/shoelace'),
          ' accepts typed properties (',
          codeView('value'),
          ', ',
          codeView('fill'),
          ', ',
          codeView('background'),
          ', ',
          codeView('size'),
          ', ',
          codeView('radius'),
          ') that the runtime diffs through Snabbdom’s propsModule. The pickers and the QR never touch each other directly; they share state through the Model.',
        ],
      ),
    ],
  )
}

const FIELD_LABEL_CLASS =
  'text-xs font-semibold uppercase tracking-wide text-slate-600'
const FIELD_CONTROL_CLASS =
  'px-3 py-2 text-sm rounded-md border border-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

const designerView = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 bg-white rounded-xl shadow-sm border border-slate-200 p-6',
      ),
    ],
    [controlsView(model), previewView(model)],
  )
}

const controlsView = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('flex flex-col gap-5')],
    [
      contentFieldView(model),
      colorFieldView({
        id: 'fill-color',
        label: 'Fill color',
        value: model.fillColor,
        onChange: value => ChangedFillColor({ value }),
      }),
      colorFieldView({
        id: 'background-color',
        label: 'Background color',
        value: model.backgroundColor,
        onChange: value => ChangedBackgroundColor({ value }),
      }),
    ],
  )
}

const contentFieldView = (model: Model): Html => {
  const h = html<Message>()

  return Ui.Input.view({
    id: 'qr-content',
    value: model.content,
    onInput: value => UpdatedContent({ value }),
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
  })
}

const colorFieldView = (
  config: Readonly<{
    id: string
    label: string
    value: string
    onChange: (value: string) => Message
  }>,
): Html => {
  const h = html<Message>()

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
              swatchRow(config.value, config.onChange),
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
): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('flex flex-wrap gap-1.5 max-w-[10rem]')],
    PRESET_COLORS.map(color =>
      h.button(
        [
          h.Type('button'),
          h.OnClick(onChange(color)),
          h.Title(color),
          h.AriaLabel(`Use ${color}`),
          h.Class(swatchClass(color.toLowerCase() === active.toLowerCase())),
          h.Style({ backgroundColor: color }),
        ],
        [],
      ),
    ),
  )
}

const QR_SIZE = 220

const previewView = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'flex flex-col items-center gap-3 self-start p-4 rounded-md bg-slate-50 border border-slate-200',
      ),
    ],
    [
      qr([
        qr.Value(model.content),
        qr.Label(`QR code for ${model.content}`),
        qr.Size(QR_SIZE),
        qr.Fill(model.fillColor),
        qr.Background(model.backgroundColor),
        qr.Radius(0),
      ]),
      h.p(
        [h.Class('text-xs text-slate-500 max-w-[14rem] text-center')],
        [
          'Live ',
          codeView('<sl-qr-code>'),
          '. Property writes diff through Snabbdom; the canvas redraws when the Model changes.',
        ],
      ),
    ],
  )
}

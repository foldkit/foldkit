import '@shoelace-style/shoelace/dist/components/qr-code/qr-code.js'
import { Schema as S } from 'effect'
import { CustomElement } from 'foldkit'
import { type Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import 'vanilla-colorful/hex-color-picker.js'

// The two side-effect imports above register each custom element with
// the browser. Foldkit does not call customElements.define for you;
// most third-party packages do it as a side effect on import. If you
// author the class yourself, you call customElements.define once next
// to the class.

// Declare a typed Foldkit binding for each element. Properties become
// PascalCase factories on the builder, events become On{PascalCase}
// factories, all checked against the declared Schema.

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
    fill: S.String,
    background: S.String,
    size: S.Number,
  },
  events: {},
})

// Mint typed builders for your Message universe (mirrors
// `M.withReturnType<T>()`).

const ChangedFillColor = m('ChangedFillColor', { value: S.String })

const Message = S.Union([ChangedFillColor])
type Message = typeof Message.Type

const fillPicker = hexColorPicker.withMessage<Message>()
const qr = qrCode.withMessage<Message>()

// Use the builders inline next to standard elements. Property factories
// write JS properties through Snabbdom's propsModule. Event factories
// convert kebab-case CustomEvents into Messages. The picker and the QR
// never talk directly; they share state through the Model.

export const designerView = (model: {
  content: string
  fillColor: string
}): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('flex gap-6')],
    [
      fillPicker([
        fillPicker.Color(model.fillColor),
        fillPicker.OnColorChanged(detail =>
          ChangedFillColor({ value: detail.value }),
        ),
      ]),
      qr([
        qr.Value(model.content),
        qr.Fill(model.fillColor),
        qr.Background('#ffffff'),
        qr.Size(200),
      ]),
    ],
  )
}

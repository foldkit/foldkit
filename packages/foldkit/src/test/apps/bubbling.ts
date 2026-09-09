import { Number, Schema } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

export const Model = Schema.Struct({
  clicks: Schema.Number,
  childClicks: Schema.Number,
  doubleClicks: Schema.Number,
  submissions: Schema.Number,
})
export type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  ClickedChild: {},
  ClickedContainer: {},
  DoubleClickedContainer: {},
  SubmittedForm: {},
})
type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  clicks: 0,
  childClicks: 0,
  doubleClicks: 0,
  submissions: 0,
}

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedChild: () => ({
      model: evo(model, { childClicks: Number.increment }),
    }),
    ClickedContainer: () => ({
      model: evo(model, { clicks: Number.increment }),
    }),
    DoubleClickedContainer: () => ({
      model: evo(model, { doubleClicks: Number.increment }),
    }),
    SubmittedForm: () => ({
      model: evo(model, { submissions: Number.increment }),
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [],
    [
      h.div(
        [h.Role('option'), h.OnClick(Message.ClickedContainer())],
        [
          h.span([], [`clicks=${model.clicks}`]),
          h.button(
            [
              h.Type('button'),
              h.OnClick(Message.ClickedChild()),
              h.AriaLabel('Bubbling child'),
            ],
            [`child clicks=${model.childClicks}`],
          ),
          h.button(
            [
              h.Type('button'),
              h.OnClick(Message.ClickedChild(), {
                defaultAction: 'Prevent',
                propagation: 'Stop',
              }),
              h.AriaLabel('Stopped child'),
            ],
            [`stopped child clicks=${model.childClicks}`],
          ),
        ],
      ),
      h.div(
        [h.Role('listitem'), h.OnDoubleClick(Message.DoubleClickedContainer())],
        [h.span([], [`dbl=${model.doubleClicks}`])],
      ),
      h.form(
        [h.Id('submission-form'), h.OnSubmit(Message.SubmittedForm())],
        [
          h.button(
            [
              h.OnClick(Message.ClickedChild()),
              h.AriaLabel('Submit with default'),
            ],
            [h.span([], ['Submit with default'])],
          ),
          h.button(
            [
              h.OnClick(Message.ClickedChild(), {
                defaultAction: 'Prevent',
              }),
              h.AriaLabel('Submit without default'),
            ],
            ['Submit without default'],
          ),
          h.button(
            [
              h.Type('not-a-button-type'),
              h.OnClick(Message.ClickedChild()),
              h.AriaLabel('Submit with invalid type'),
            ],
            ['Submit with invalid type'],
          ),
          h.span([], [`submissions=${model.submissions}`]),
        ],
      ),
      h.button(
        [
          h.Type('SUBMIT'),
          h.Attribute('form', 'submission-form'),
          h.OnClick(Message.ClickedChild()),
          h.AriaLabel('Submit through form owner'),
        ],
        ['Submit through form owner'],
      ),
    ],
  )
}

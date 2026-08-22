import { Schema as S } from 'effect'
import { CustomElement, type Runtime, type Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

export const Model = S.Struct({
  count: S.Number,
  formState: S.Literals(['Controlled', 'Released']),
})
export type Model = typeof Model.Type

export const Flags = S.Struct({ start: S.Number })
export type Flags = typeof Flags.Type

export const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedRelease: {},
})
export type Message = typeof Message.Type

export const init: Runtime.ApplicationInit<Model, Message, Flags> = flags => ({
  model: { count: flags.start, formState: 'Controlled' },
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedIncrement: () => ({
      model: evo(model, { count: count => count + 1 }),
    }),
    ClickedRelease: () => ({
      model: evo(model, { formState: () => 'Released' }),
    }),
  })

const serverOnlyPin = import.meta.env.SSR ? '{{SERVER_ONLY_PIN}}' : ''
const observedId = CustomElement.define({
  tag: 'x-observed-id',
  properties: {},
  events: {},
})
const parserOwned = CustomElement.define({
  tag: 'x-parser-owned',
  properties: {},
  events: {},
})
const parserChild = CustomElement.define({
  tag: 'x-parser-child',
  properties: {},
  events: {},
})

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const observedIdElement = observedId.withMessage(h)
  const parserOwnedElement = parserOwned.withMessage(h)
  const parserChildElement = parserChild.withMessage(h)
  return {
    title: `Count ${model.count}`,
    body: h.main(
      [h.Id('app-root')],
      [
        h.h1(
          [h.Id('heading')],
          [serverOnlyPin === '' ? 'Packed consumer' : 'Packed consumer'],
        ),
        h.input([h.Id('field'), h.Type('text'), h.Name('email')]),
        h.iframe([
          h.Id('adopted-frame'),
          h.Src('/adopted-frame'),
          h.Title('Adopted frame'),
        ]),
        h.button(
          [h.Id('increment'), h.OnClick(Message.ClickedIncrement())],
          [`Count: ${model.count}`],
        ),
        // Browser behavior that needs no Foldkit listener: a link that
        // navigates, a form that submits, and a control that takes focus. A page
        // this build refused must do none of it.
        h.a([h.Id('native-link'), h.Href('/navigated')], ['Go']),
        h.form(
          [h.Id('native-form'), h.Action('/submitted'), h.Method('get')],
          [
            h.input([
              h.Type('hidden'),
              h.Name('account'),
              h.Value('old-account'),
            ]),
            h.button([h.Id('native-submit'), h.Type('submit')], ['Send']),
          ],
        ),
        h.form(
          [h.Id('release-form'), h.Title('form-owned')],
          [
            h.input([
              h.Id('equal-value'),
              ...(model.formState === 'Released' ? [] : [h.Value('same')]),
            ]),
            h.input([
              h.Id('equal-checked'),
              h.Type('checkbox'),
              ...(model.formState === 'Released' ? [] : [h.Checked(true)]),
            ]),
            h.select(
              model.formState === 'Released'
                ? [h.Id('raw-select')]
                : [h.Id('raw-select'), h.Value('a')],
              [
                h.option([h.Value('a')], ['A']),
                h.option(
                  model.formState === 'Released'
                    ? [h.Value('b'), h.Attribute('selected', '')]
                    : [h.Value('b')],
                  ['B'],
                ),
              ],
            ),
            h.textarea(
              model.formState === 'Released'
                ? [h.Id('released-textarea'), h.InnerHTML('textarea default')]
                : [h.Id('released-textarea'), h.Value('controlled')],
            ),
            h.output(
              model.formState === 'Released'
                ? [
                    h.Id('released-output'),
                    h.InnerHTML(
                      '<span id="output-child">output default</span>',
                    ),
                  ]
                : [h.Id('released-output'), h.Value('controlled')],
            ),
            h.select(
              model.formState === 'Released'
                ? [
                    h.Id('inner-select'),
                    h.InnerHTML(
                      '<option value="a" selected>A</option><option value="b">B</option>',
                    ),
                  ]
                : [h.Id('inner-select'), h.Value('b')],
              model.formState === 'Released'
                ? undefined
                : [
                    h.option([h.Value('a')], ['A']),
                    h.option([h.Value('b')], ['B']),
                  ],
            ),
            h.input(
              model.formState === 'Released'
                ? [
                    h.Id('released-file'),
                    h.Attribute('type', 'FiLe'),
                    h.Attribute('value', 'default-file-name'),
                  ]
                : [
                    h.Id('released-file'),
                    h.Type('text'),
                    h.Value('controlled'),
                  ],
            ),
            h.input(
              model.formState === 'Released'
                ? [h.Id('released-size')]
                : [h.Id('released-size'), h.Size(3)],
            ),
            h.div(
              model.formState === 'Released'
                ? [h.Id('released-tabindex')]
                : [h.Id('released-tabindex'), h.Tabindex(4), h.Title('owned')],
            ),
            h.textarea(
              model.formState === 'Released'
                ? [h.Id('released-dimensions')]
                : [h.Id('released-dimensions'), h.Cols(4), h.Rows(5)],
            ),
            h.ol(
              model.formState === 'Released'
                ? [h.Id('released-start')]
                : [h.Id('released-start'), h.Start(6)],
              [h.li([], ['item'])],
            ),
            h.div([
              h.Id('styled'),
              h.Style({
                '--accent': 'packed',
                color: model.formState === 'Released' ? '#0000ff' : '#ff0000',
              }),
            ]),
            observedIdElement([
              h.Id('observed-id'),
              h.Dir('LTR'),
              h.InnerHTML(
                '<x-inner-probe id="custom-inner-probe"></x-inner-probe>',
              ),
            ]),
            h.div([
              h.Id('native-inner-html'),
              h.InnerHTML(
                '<x-inner-probe id="native-inner-probe"></x-inner-probe>',
              ),
            ]),
            h.div(
              [h.Id('parser-earlier'), h.Title('earlier-owned')],
              ['earlier-text'],
            ),
            parserOwnedElement(
              [h.Id('parser-owned'), h.Title('view-owned')],
              [parserChildElement([h.Id('parser-view-child')], ['view'])],
            ),
            h.button(
              [
                h.Id('release'),
                h.Type('button'),
                h.OnClick(Message.ClickedRelease()),
              ],
              ['Release ownership'],
            ),
          ],
        ),
      ],
    ),
  }
}

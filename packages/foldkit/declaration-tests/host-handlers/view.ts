import { HostComposition } from './composition.js'
import { Message } from './contracts.js'

export const view = HostComposition.makeView((model, h) => ({
  title: 'Hosted value',
  body: h.button([h.OnClick(Message.ClickedReadValue())], [model.value]),
}))

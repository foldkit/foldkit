import { Css } from 'foldkit'

Css.number(0.1 + 0.2) // '0.3'
Css.percent(100 / 3) // '33.3333%'
Css.px(12) // '12px'
Css.rem(0.75) // '0.75rem'
Css.deg(45) // '45deg'
Css.s(0.3 + 2 * 0.08) // '0.46s'
Css.ms(150) // '150ms'

const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.li([
    h.Style({
      width: Css.percent(model.progress * 100),
      animationDelay: Css.s(0.3 + model.index * 0.08),
    }),
  ])

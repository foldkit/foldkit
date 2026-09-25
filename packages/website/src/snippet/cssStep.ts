const backdropView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div([
    h.Class('backdrop'),
    h.Style({ opacity: Css.number(model.dimAmount, { step: 0.01 }) }),
  ])

Css.number(0.4312, { step: 0.01 }) // '0.43'
Css.number(0.4349, { step: 0.01 }) // '0.43', so no style write
Css.number(0.25, { step: 0.5 }) // '0.5'
Css.number(-0.25, { step: 0.5 }) // '0'

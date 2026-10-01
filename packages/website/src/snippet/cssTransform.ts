const ghostView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div([
    h.Class('drag-ghost'),
    h.Style({
      transform: `translate3d(${Css.px(model.clientX)}, ${Css.px(model.clientY)}, 0)`,
      width: `calc(100% - ${Css.rem(model.gutter * 2)})`,
    }),
  ])

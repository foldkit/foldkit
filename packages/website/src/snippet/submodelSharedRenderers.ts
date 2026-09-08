// view/docs.ts (inside the parent's view, with its builder `h` in scope)
h.submodel({
  slotId: 'coming-from-react',
  model: model.comingFromReact,
  view: ComingFromReact.view,
  viewInputs: {
    renderCopyButton: SnippetCopy.renderer(
      model.snippetCopy,
      message => Message.GotSnippetCopyMessage({ message }),
      h,
    ),
    renderHeadingLink: Prose.renderHeadingLink(
      hash => Message.ClickedCopyLink({ hash }),
      h,
    ),
  },
  toParentMessage: message => Message.GotComingFromReactMessage({ message }),
})

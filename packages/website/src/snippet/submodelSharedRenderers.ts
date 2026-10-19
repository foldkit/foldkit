// view/docs.ts (inside the parent's view, with its builder `h` in scope)
const renderCopyButton = SnippetCopy.renderer(
  model.snippetCopy,
  message => Message.GotSnippetCopyMessage({ message }),
  h,
)

h.submodel({
  slotId: 'coming-from-react',
  model: model.comingFromReact,
  view: ComingFromReact.view,
  viewInputs: {
    renderCopyButton,
    renderSnippet: SnippetDisclosure.renderer(
      model.snippetDisclosure,
      message => Message.GotSnippetDisclosureMessage({ message }),
      renderCopyButton,
      h,
    ),
    renderHeadingLink: Prose.renderHeadingLink(
      hash => Message.ClickedCopyLink({ hash }),
      h,
    ),
  },
  toParentMessage: message => Message.GotComingFromReactMessage({ message }),
})

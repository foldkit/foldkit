const renderCopyButton = SnippetCopy.renderer(model.snippetCopy, config =>
  h.block(SnippetCopyBinding.embedView(config)),
)

h.block(
  ComingFromReactBinding.embedView({
    slotId: 'coming-from-react',
    model: model.comingFromReact,
    viewInputs: {
      renderCopyButton,
      renderSnippet: SnippetDisclosure.renderer(
        model.snippetDisclosure,
        renderCopyButton,
        config => h.block(SnippetDisclosureBinding.embedView(config)),
      ),
      renderHeadingLink: Prose.renderHeadingLink(
        hash => Message.ClickedCopyLink({ hash }),
        h,
      ),
    },
  }),
)

scene(
  { update, view, routing: { onUrlChange: Message.ChangedUrl } },
  given(initialModel),
  type(label('Search'), 'foldkit'),
  Command.resolveAllExact(
    [CancelSearch, Message.CompletedCancelSearch()],
    [ReplaceSearchUrl, Message.CompletedReplaceSearchUrl()],
  ),
  Command.expectNone(),
  Navigation.changedUrl('/?q=foldkit#results'),
  Command.expectExact(FetchSearch({ searchId: 2, query: 'foldkit' })),
  Command.resolve(
    FetchSearch,
    Message.CompletedFetchSearch({
      searchId: 2,
      results: ['foldkit.dev'],
    }),
  ),
  expect(role('status')).toHaveText('foldkit.dev'),
)

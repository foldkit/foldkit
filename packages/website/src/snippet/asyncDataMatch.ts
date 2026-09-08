AsyncData.match(model.allNotes, {
  onIdle: () => spinner(),
  onLoading: () => spinner(),
  onRefreshing: notes => noteList(notes),
  onFailure: error => errorBanner(error),
  onStale: ({ error, data }) => noteList(data, { staleBanner: error }),
  onSuccess: notes => noteList(notes),
})

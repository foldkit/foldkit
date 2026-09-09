AsyncData.matchData(model.allNotes, {
  onEmpty: () => spinner(),
  onFailure: error => errorBanner(error),
  onData: notes => noteList(notes),
})

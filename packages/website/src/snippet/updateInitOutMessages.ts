const searchBoot = Search.boot()
const editorBoot = Editor.boot()

const model: Model = {
  search: searchBoot.model,
  editor: editorBoot.model,
}

return Update.combine<Model, Message>(model, [
  stepModel =>
    Update.foldChildInit(searchBoot, {
      toParentModel: () => stepModel,
      toParentMessage: toGotSearchMessage,
      foldOutMessage: foldSearchOutMessage,
    }),
  stepModel =>
    Update.foldChildInit(editorBoot, {
      toParentModel: () => stepModel,
      toParentMessage: toGotEditorMessage,
      foldOutMessage: foldEditorOutMessage,
    }),
])

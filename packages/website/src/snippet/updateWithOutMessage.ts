const dialogClose = closeDialog(model)

return pipe(dialogClose, Update.withOutMessage(outMessage))

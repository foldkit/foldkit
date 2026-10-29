type ChildBlockModel = typeof Child.ChildBlock.Model.Type
type ChildBlockMessage = typeof Child.ChildBlock.Message.Type
type ChildBlockOutMessage = typeof Child.ChildBlock.OutMessage.Type

const childUpdate: Update.ReturnWithOutMessage<
  ChildBlockModel,
  ChildBlockMessage,
  ChildBlockOutMessage
> = Child.ChildBlock.update(model.child, message)

// Type error: childUpdate may contain an OutMessage that this type cannot hold.
const plainChildUpdate: Update.Return<ChildBlockModel, ChildBlockMessage> =
  childUpdate

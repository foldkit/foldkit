const childUpdate: Update.ReturnWithOutMessage<
  Child.Model,
  Child.Message,
  Child.OutMessage
> = Child.update(model.child, message)

// Type error: childUpdate may contain an OutMessage that this type cannot hold.
const plainChildUpdate: Update.Return<Child.Model, Child.Message> = childUpdate

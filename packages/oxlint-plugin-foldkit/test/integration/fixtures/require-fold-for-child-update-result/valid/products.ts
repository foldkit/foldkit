export type Model = Readonly<{ value: string }>
export type Message = Readonly<{ type: 'Changed' }>

export const update = (model: Model, _message: Message) => ({ model })

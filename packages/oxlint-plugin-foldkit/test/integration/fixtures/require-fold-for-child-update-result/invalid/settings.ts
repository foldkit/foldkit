export type Model = Readonly<{ theme: string }>
export type Message = Readonly<{ type: 'ChangedTheme' }>

export const update = (model: Model, _message: Message) => ({ model })

export const setTheme = (model: Model, theme: string) => ({
  model: { ...model, theme },
})

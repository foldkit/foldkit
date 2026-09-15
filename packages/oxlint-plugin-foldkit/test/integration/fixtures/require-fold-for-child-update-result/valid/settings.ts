export type Model = Readonly<{ theme: string }>

export const init = () => ({
  model: { theme: 'System' },
  commands: [],
})

export const setTheme = (model: Model, theme: string) => ({
  model: { ...model, theme },
})

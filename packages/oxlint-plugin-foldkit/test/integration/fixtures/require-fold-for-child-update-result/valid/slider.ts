export type Model = Readonly<{ min: number; max: number }>

export const init = (): Model => ({ min: 0, max: 100 })

export const reflectRange = (range: Model) => range

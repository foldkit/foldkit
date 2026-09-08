import { createKeyedLazy } from 'foldkit/html'

const keyedRow = createKeyedLazy()

export const localKeys = (values: ReadonlyArray<string>) =>
  values.map((_value, index) => {
    const keyedRow = (key: number) => key

    return keyedRow(index)
  })

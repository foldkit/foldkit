const createKeyedLazy = () => (key: number) => key

const localLazy = createKeyedLazy()

export const localKeys = (values: ReadonlyArray<string>) =>
  values.map((_value, index) => localLazy(index))

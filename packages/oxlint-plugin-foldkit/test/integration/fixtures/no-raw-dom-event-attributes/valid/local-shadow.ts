const ih = {
  Attribute: (name: string, value: string): ReadonlyArray<string> => [
    name,
    value,
  ],
}

export const reloadAttribute = ih.Attribute('onclick', 'location.reload()')

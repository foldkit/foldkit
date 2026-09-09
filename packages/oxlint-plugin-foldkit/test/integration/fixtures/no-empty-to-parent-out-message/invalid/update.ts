declare const update: unknown
declare const propertyName: string
declare const forwardingMapper: unknown

export const emptyMapper = {
  update,
  toParentOutMessage: () => undefined,
}

export const trailingCommaMapper = {
  toParentOutMessage: () => undefined,
}

export const commentedMapper = {
  update,
  // This comment must survive an autofix pass.
  toParentOutMessage: () => undefined,
}

export const blockMapper = {
  update,
  toParentOutMessage: () => {
    return undefined
  },
}

export const functionMapper = {
  update,
  toParentOutMessage: function () {
    return undefined
  },
}

export const methodMapper = {
  update,
  toParentOutMessage() {
    return undefined
  },
}

export const dynamicProperty = {
  [propertyName]: forwardingMapper,
  toParentOutMessage: () => undefined,
}

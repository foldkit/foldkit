declare const update: unknown
declare const toParentOutMessage: unknown
declare const parentOutMessage: unknown

export const omittedMapper = { update }
export const namedMapper = { update, toParentOutMessage }
export const forwardingMapper = {
  update,
  toParentOutMessage: () => parentOutMessage,
}

export const shadowedUndefined = (undefined: unknown) => ({
  update,
  toParentOutMessage: () => undefined,
})

export const asyncMapper = {
  update,
  toParentOutMessage: async () => undefined,
}

export const generatorMapper = {
  update,
  *toParentOutMessage() {
    return undefined
  },
}

export const getter = {
  update,
  get toParentOutMessage() {
    return undefined
  },
}

const Stream = {
  map: (callback: (event: Event) => void) => callback,
}

export const handleEvent = Stream.map(event => event.preventDefault())

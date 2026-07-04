import { Mount } from 'foldkit'

// ❌ Bad
// A Mount factory that never touches its element has misidentified its cause:
// if the element is not read or written, this is not Mount's job.
const badMount = Mount.define(() => () => {
  startAnalytics()
})

// ✅ Good
const goodMount = Mount.define(() => element => {
  observeVisibility(element)
})

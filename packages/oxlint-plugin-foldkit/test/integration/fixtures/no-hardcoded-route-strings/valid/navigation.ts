import { load, openUrl } from 'foldkit/navigation'

// load and openUrl are full-page and new-tab primitives that legitimately
// take server endpoints and static assets, so a hardcoded path is correct.
export const logout = () => load('/logout')

export const openReport = () => openUrl('/report.pdf')

export const buildId = import.meta.env.FOLDKIT_BUILD_ID

document.documentElement.dataset['buildId'] = buildId

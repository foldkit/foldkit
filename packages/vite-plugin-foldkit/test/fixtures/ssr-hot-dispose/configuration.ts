const previousEvaluations: number = import.meta.hot?.data.evaluations ?? 0

export const configurationEvaluations = previousEvaluations + 1

if (import.meta.hot) {
  import.meta.hot.data.evaluations = configurationEvaluations
}

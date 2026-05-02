import { Match, Option, String, flow } from 'effect'

export const validateProjectName = (name: string): Option.Option<string> =>
  Match.value(name).pipe(
    Match.when(String.isEmpty, () =>
      Option.some('Project name cannot be empty'),
    ),
    Match.whenOr(String.includes('/'), String.includes('\\'), () =>
      Option.some('Project name cannot contain path separators (/ or \\)'),
    ),
    Match.when(String.includes(' '), () =>
      Option.some('Project name cannot contain spaces'),
    ),
    Match.when(flow(String.match(/[<>:"|?*]/), Option.isSome), () =>
      Option.some(
        'Project name cannot contain special characters: < > : " | ? *',
      ),
    ),
    Match.whenOr(String.startsWith('.'), String.startsWith('-'), () =>
      Option.some('Project name cannot start with . or -'),
    ),
    Match.orElse(() => Option.none()),
  )

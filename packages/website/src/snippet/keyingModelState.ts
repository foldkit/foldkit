import { html } from 'foldkit/html'
import * as M from 'foldkit/match'

const { div, keyed } = html<Message>()

const view = (model: Model): Html =>
  div(
    [],
    [
      keyed('div')(
        model._tag,
        [],
        [
          M.value(model).pipe(
            M.tagsExhaustive({
              LoggedOut: loggedOutModel =>
                LoginForm.view(loggedOutModel, message =>
                  GotLoginFormMessage({ message }),
                ),
              LoggedIn: loggedInModel =>
                Dashboard.view(loggedInModel, message =>
                  GotDashboardMessage({ message }),
                ),
            }),
          ),
        ],
      ),
    ],
  )

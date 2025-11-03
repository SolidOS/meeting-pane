import * as logic from 'solid-logic'
import MeetingPane from '../src/meetingPane'
import * as $rdf from 'rdflib'
import * as UI from 'solid-ui'

async function appendMeetingPane (dom, uri) {
  const subject = $rdf.sym(uri)
  const doc = subject.doc()

  await new Promise((resolve, reject) => {
    logic.store.fetcher.load(doc).then(resolve, reject)
  })
  const context = { // see https://github.com/solid/solid-panes/blob/005f90295d83e499fd626bd84aeb3df10135d5c1/src/index.ts#L30-L34
    dom,
    session: {
      store: logic.store
    },
    getOutliner: () => null
  }
  const options = {}

  const paneDiv = MeetingPane.render(subject, context, options)
  dom.body.appendChild(paneDiv)
}

// const webIdToShow = 'https://timbl.com/timbl/Public/Test/Meeting/Brainstorming/index.ttl#this'
const webIdToShow = 'https://timea.solidcommunity.net/TestMeeting/index.ttl#this'

logic.store.fetcher.load(webIdToShow).then(() => {
  appendMeetingPane(document, webIdToShow)
})

// window.onload = () => {
console.log('document ready')
const loginBanner = document.getElementById('loginBanner')
loginBanner.appendChild(UI.login.loginStatusBox(document, null, {}))

async function finishLogin () {
  await logic.authSession.handleIncomingRedirect()
  const session = logic.authSession
  if (session.info.isLoggedIn) {
    console.log(`Logged in as ${session.webId}`)

    document.getElementById('loginBanner').innerHTML = `Logged in as ${logic.authn.currentUser().uri}`
  } else {
    console.log('The user is not logged in')
    // document.getElementById('loginBanner').innerHTML = '<button onclick="popupLogin()">Log in</button>'
  }
}

finishLogin()
// }

import { store, authSession, authn } from 'solid-logic'
const MeetingPane = require('./meetingPane.js')
const $rdf = require('rdflib')
const UI = require('solid-ui')
// const SolidAuth = require('solid-auth-client')

async function appendMeetingPane (dom, uri) {
  const subject = $rdf.sym(uri)
  const doc = subject.doc()

  await new Promise((resolve, reject) => {
    store.fetcher.load(doc).then(resolve, reject)
  })
  const context = { // see https://github.com/solid/solid-panes/blob/005f90295d83e499fd626bd84aeb3df10135d5c1/src/index.ts#L30-L34
    dom,
    session: {
      store: store
    }
  }
  const options = {}

  const paneDiv = MeetingPane.render(subject, context, options)
  dom.body.appendChild(paneDiv)
}

document.addEventListener('DOMContentLoaded', function () {
  // Set up the view for the subject indicated in the fragment of the window's URL
  const uri = decodeURIComponent(window.location.hash.substr(1))
  if (uri.length === 0) {
    // window.location = '?#' + encodeURIComponent('https://michielbdejong.inrupt.net/meetings/Data%20browser%2016%20Dec%202019/index.ttl#this')
    window.location = '?#' + encodeURIComponent('https://timbl.com/timbl/Public/Test/Meeting/Brainstorming/index.ttl#this')
  }
  appendMeetingPane(document, uri)
})

// window.onload = () => {
console.log('document ready')
const loginBanner = document.getElementById('loginBanner')
loginBanner.appendChild(UI.login.loginStatusBox(document, null, {}))

async function finishLogin () {
  await authSession.handleIncomingRedirect()
  const session = authSession
  if (session.info.isLoggedIn) {
    console.log(`Logged in as ${session.webId}`)

    document.getElementById('loginBanner').innerHTML = `Logged in as ${authn.currentUser().uri}`
  } else {
    console.log('The user is not logged in')
    // document.getElementById('loginBanner').innerHTML = '<button onclick="popupLogin()">Log in</button>'
  }
}

finishLogin()
// }

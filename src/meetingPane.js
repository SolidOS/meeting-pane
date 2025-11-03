/*   Meeting materials and tools Pane
 **
 **  Putting together some of the tools we have to manage a Meeting
 */
import * as logic from 'solid-logic'
import * as UI from 'solid-ui'
import * as $rdf from 'rdflib'
import meetingDetailsFormText from './meetingDetailsForm'

const VideoRoomPrefix = 'https://meet.jit.si/'
const ns = UI.ns

export default {
  icon: UI.icons.iconBase + 'noun_66617.svg',

  name: 'meeting',

  audience: [ns.solid('PowerUser')],

  label: function (subject, context) {
    const kb = context.session.store
    const ns = UI.ns
    if (kb.holds(subject, ns.rdf('type'), ns.meeting('Meeting'))) {
      return 'Meeting'
    }
    return null // Suppress pane otherwise
  },

  // Create a new Meeting thing
  //
  //  returns: A promise of a meeting object
  //

  mintClass: UI.ns.meeting('Meeting'),

  mintNew: function (context, options) {
    return new Promise(function (resolve, reject) {
      const kb = context.session.store
      const ns = UI.ns
      options.newInstance =
        options.newInstance || kb.sym(options.newBase + 'index.ttl#this')
      const meeting = options.newInstance
      const meetingDoc = meeting.doc()

      const me = logic.authn.currentUser()

      if (me) {
        kb.add(meeting, ns.dc('author'), me, meetingDoc)
      }

      kb.add(meeting, ns.rdf('type'), ns.meeting('Meeting'), meetingDoc)
      kb.add(meeting, ns.dc('created'), new Date(), meetingDoc)
      kb.add(
        meeting,
        ns.ui('backgroundColor'),
        new $rdf.Literal('#ddddcc', undefined, ns.xsd('color')),
        meetingDoc
      )
      const toolList = new $rdf.Collection()
      kb.add(meeting, ns.meeting('toolList'), toolList, meetingDoc)

      toolList.elements.push(meeting) // Add the meeting itself - see renderMain()

      kb.updater.put(
        meetingDoc,
        kb.statementsMatching(undefined, undefined, undefined, meetingDoc),
        'text/turtle',
        function (uri2, ok, message) {
          if (ok) {
            resolve(options)
          } else {
            reject(new Error('Error writing meeting configuration: ' + message))
          }
        }
      )
    })
  },

  // Returns a div

  render: function (subject, dataBrowserContext) {
    const dom = dataBrowserContext.dom
    const kb = dataBrowserContext.session.store
    const ns = UI.ns
    const updater = kb.updater
    const thisPane = this

    const complain = function complain (message, color) {
      console.log(message)
      const pre = dom.createElement('pre')
      pre.setAttribute('style', 'background-color: ' + color || '#eed' + ';')
      div.appendChild(pre)
      pre.appendChild(dom.createTextNode(message))
    }

    const complainIfBad = function (ok, message) {
      if (!ok) complain(message)
    }

    const meeting = subject
    const meetingDoc = subject.doc()
    const meetingBase = subject.dir().uri
    const div = dom.createElement('div')
    const table = div.appendChild(dom.createElement('table'))
    table.style = 'width: 100%; height: 100%; margin:0;'
    const topTR = table.appendChild(dom.createElement('tr'))
    topTR.appendChild(dom.createElement('div')) // topDiv
    const mainTR = table.appendChild(dom.createElement('tr'))

    const toolBar0 = table.appendChild(dom.createElement('td'))
    const toolBar1 = toolBar0.appendChild(dom.createElement('table'))
    const toolBar = toolBar1.appendChild(dom.createElement('tr'))

    topTR.setAttribute('style', 'height: 2em;') // spacer if notthing else

    let me = null // @@ Put code to find out logged in person

    const saveBackMeetingDoc = function () {
      updater.put(
        meetingDoc,
        kb.statementsMatching(undefined, undefined, undefined, meetingDoc),
        'text/turtle',
        function (uri2, ok, message) {
          if (ok) {
            tabs.refresh()
            resetTools()
          } else {
            message =
              'FAILED to save new thing at: ' + meetingDoc + ' : ' + message
            complain(message)
          }
        }
      )
    }

    const saveAppDocumentLinkAndAddNewThing = function (tool, thing, pred) {
      const appDoc = thing.doc()
      if (pred) {
        kb.add(meeting, pred, thing, appDoc) // Specific Link back to meeting
      }
      kb.add(thing, ns.meeting('parentMeeting'), meeting, appDoc) // Generic link back to meeting
      updater.put(
        appDoc,
        kb.statementsMatching(undefined, undefined, undefined, appDoc),
        'text/turtle',
        function (uri2, ok, message) {
          if (ok) {
            saveBackMeetingDoc()
          } else {
            complain('FAILED to save new tool at: ' + thing + ' : ' + message)
          }
        }
      )
    }

    const makeToolNode = function (target, pred, label, iconURI) {
      if (pred) {
        kb.add(meeting, pred, target, meetingDoc)
      }
      const x = UI.widgets.newThing(meetingDoc)
      if (label) kb.add(x, ns.rdfs('label'), label, meetingDoc)
      if (iconURI) kb.add(x, ns.meeting('icon'), kb.sym(iconURI), meetingDoc)
      kb.add(x, ns.rdf('type'), ns.meeting('Tool'), meetingDoc)
      kb.add(x, ns.meeting('target'), target, meetingDoc)
      const toolList = kb.the(meeting, ns.meeting('toolList'))
      toolList.elements.push(x)
      return x
    }

    // Map from end-user non-iframeable Google maps URI to G Maps API
    // Input: like https://www.google.co.uk/maps/place/Mastercard/@53.2717971,-6.2042699,17z/...
    // Output:
    function googleMapsSpecial (page) {
      const initialPrefix = /https:\/\/www\.google\..*\/maps\//
      const finalPrefix = 'https://www.google.com/maps/embed/v1/'
      const myPersonalApiKEY = 'AIzaSyB8aaT6bY9tcLCmc2oPCkdUYLmTOWM8R54' // Get your own key!
      // GET YOUR KEY AT https://developers.google.com/maps/documentation/javascript/
      const uri = page.uri
      if (!uri.match(initialPrefix)) return page
      if (uri.startsWith(finalPrefix)) return page // Already done
      const map =
        uri.replace(initialPrefix, finalPrefix) + '&key=' + myPersonalApiKEY
      console.log('Converted Google Map URI! ' + map)
      return $rdf.sym(map)
    }

    // ////////////////////  DRAG and Drop

    const handleDroppedThing = function (target) {
      // @@ idea: look
      return new Promise(function (resolve) {
        // Add a meeting tab for a web resource.  Alas many resource canot be framed
        // as they block framing, or are insecure.
        const addIframeTool = function (target) {
          const tool = makeToolNode(
            target,
            UI.ns.wf('attachment'),
            UI.utils.label(target),
            null
          )
          kb.add(tool, UI.ns.meeting('view'), 'iframe', meetingDoc)
        }

        const addLink = function (target) {
          const pred = ns.wf('attachment')
          kb.add(subject, pred, target, subject.doc())
          const toolObject = {
            icon: 'noun_160581.svg', // right arrow "link"
            limit: 1,
            shareTab: true // but many things behind it
          }
          const newPaneOptions = {
            newInstance: subject, // kb.sym(subject.doc().uri + '#LinkListTool'),
            pane: dataBrowserContext.session.paneRegistry.byName('link'), // the pane to be used to mint a new thing
            predicate: ns.meeting('attachmentTool'),
            tabTitle: 'Links',
            view: 'link', // The pane to be used when it is viewed
            noIndexHTML: true
          }
          return makeNewPaneTool(toolObject, newPaneOptions)
        }

        // When paerson added to he meeting, make an ad hoc group
        // of meeting participants is one does not already exist, and add them
        const addParticipant = function (target) {
          const pref = kb.any(target, ns.foaf('preferredURI'))
          const obj = pref ? kb.sym(pref) : target
          const group = kb.any(meeting, ns.meeting('attendeeGroup'))
          const addPersonToGroup = function (obj, group) {
            const ins = [
              $rdf.st(group, UI.ns.vcard('hasMember'), obj, group.doc())
            ] // @@@ Complex rules about webid?
            const name =
              kb.any(obj, ns.vcard('fn')) || kb.any(obj, ns.foaf('name'))
            if (name) {
              ins.push($rdf.st(obj, UI.ns.vcard('fn'), name, group.doc()))
            }
            kb.fetcher.nowOrWhenFetched(group.doc(), undefined, function (
              ok,
              _body
            ) {
              if (!ok) {
                complain('Can\'t read group to add person' + group)
                return
              }
              kb.updater.update([], ins, function (uri, ok, body) {
                complainIfBad(ok, body)
                if (ok) {
                  console.log('Addded to particpants OK: ' + obj)
                }
              })
            })
          }
          if (group) {
            addPersonToGroup(obj, group)
            return
          }
          makeParticipantsGroup()
            .then(function (options) {
              const group = options.newInstance
              addPersonToGroup(obj, group)
              kb.fetcher
                .putBack(meetingDoc, { contentType: 'text/turtle' })
                .then(function (_xhr) {
                  console.log('Particiants Group created: ' + group)
                })
            })
            .catch(function (err) {
              complain(err)
            })
        }

        console.log('Dropped on thing ' + target) // icon was: UI.icons.iconBase + 'noun_25830.svg'
        const u = target.uri
        if (u.startsWith('http:') && u.indexOf('#') < 0) {
          // insecure Plain document
          addLink(target)
          return resolve(target)
        }
        kb.fetcher.nowOrWhenFetched(target, function (ok, mess) {
          function addAttachmentTab (target) {
            target = googleMapsSpecial(target)
            console.log('make web page attachement tab ' + target) // icon was: UI.icons.iconBase + 'noun_25830.svg'
            const tool = makeToolNode(
              target,
              UI.ns.wf('attachment'),
              UI.utils.label(target),
              null
            )
            kb.add(tool, UI.ns.meeting('view'), 'iframe', meetingDoc)
            return resolve(target)
          }
          if (!ok) {
            console.log(
              'Error looking up dropped thing, will just add it anyway. ' +
                target +
                ': ' +
                mess
            )
            return addAttachmentTab(target) // You can still try iframing it.  (Could also add to list of links in PersonTR widgets)
          } else {
            const obj = target
            const types = kb.findTypeURIs(obj)
            for (const ty in types) {
              console.log('    drop object type includes: ' + ty)
            }
            if (
              ns.vcard('Individual').uri in types ||
              ns.foaf('Person').uri in types ||
              ns.foaf('Agent').uri in types
            ) {
              addParticipant(target)
              return resolve(target)
            }
            if (u.startsWith('https:') && u.indexOf('#') < 0) {
              // Plain secure document
              // can we iframe it?
              const hh = kb.fetcher.getHeader(target, 'x-frame-options')
              let ok2 = true
              if (hh) {
                for (let j = 0; j < hh.length; j++) {
                  console.log('x-frame-options: ' + hh[j])
                  if (hh[j].indexOf('sameorigin') < 0) {
                    // (and diff origin @@)
                    ok2 = false
                  }
                  if (hh[j].indexOf('deny') < 0) {
                    ok2 = false
                  }
                }
              }
              if (ok2) {
                target = googleMapsSpecial(target) // tweak Google maps to embed OK
                addIframeTool(target) // Something we can maybe iframe
                return resolve(target)
              }
            } // Something we cannot iframe, and must link to:
            console.log('Default: assume web page attachement ' + target) // icon was: UI.icons.iconBase + 'noun_25830.svg'
            return addAttachmentTab(target)
          }
        })
      }) // promise
    }

    // When a set of URIs are dropped on the tabs
    const droppedURIHandler = function (uris) {
      Promise.all(
        uris.map(function (u) {
          const target = $rdf.sym(u) // Attachment needs text label to disinguish I think not icon.
          return handleDroppedThing(target) // can add to meetingDoc but must be sync
        })
      ).then(function (_a) {
        saveBackMeetingDoc()
      })
    }

    const droppedFileHandler = function (files) {
      UI.widgets.uploadFiles(
        kb.fetcher,
        files,
        meeting.dir().uri + 'Files',
        meeting.dir().uri + 'Pictures',
        function (theFile, _destURI) {
          if (theFile.type.startsWith('image/')) {
            makePicturesFolder('Files') // If necessary
          } else {
            makeMaterialsFolder('Pictures')
          }
        }
      )
    }

    // //////////////////////////////////////////////////////  end of drag drop

    const makeGroup = function (_toolObject) {
      const newBase = meetingBase + 'Group/'
      const kb = dataBrowserContext.session.store
      let group = kb.any(meeting, ns.meeting('particpants'))
      if (!group) {
        group = $rdf.sym(newBase + 'index.ttl#this')
      }
      console.log('Participant group: ' + group)

      const tool = makeToolNode(
        group,
        ns.meeting('particpants'),
        'Particpants',
        UI.icons.iconBase + 'noun_339237.svg'
      ) // group: noun_339237.svg  'noun_15695.svg'
      kb.add(tool, UI.ns.meeting('view'), 'peoplePicker', meetingDoc)
      saveBackMeetingDoc()
    }
    /*
    var makeAddressBook = function (toolObject) {
      var newBase = meetingBase + 'Group/'
      var kb = store
      var group = kb.any(meeting, ns.meeting('addressBook'))
      if (!group) {
        group = $rdf.sym(newBase + 'index.ttl#this')
      }

      // Create a tab for the addressbook
      var div = dom.createElement('div')
      var context = { dom: dom, div: div }
      var book
      UI.login.findAppInstances(context, ns.vcard('AddressBook')).then(
        function (context) {
          if (context.instances.length === 0) {
            complain('You have no solid address book. It is really handy to have one to keep track of people and groups')
          } else if (context.instances.length > 1) {
            var s = context.instances.map(function (x) { return '' + x }).join(', ')
            complain('You have more than one solid address book: ' + s + ' Not supported yet.')
          } else { // addressbook
            book = context.instances[0]
            var tool = makeToolNode(book, ns.meeting('addressBook'), 'Address Book', UI.icons.iconBase + 'noun_15695.svg') // group: noun_339237.svg
            kb.add(tool, UI.ns.meeting('view'), 'contact', meetingDoc)
            saveBackMeetingDoc()
          }
        }
      )
    }
    */
    const makePoll = function (toolObject) {
      const newPaneOptions = {
        useExisting: meeting, // Regard the meeting as being the schedulable event itself.
        // newInstance: meeting,
        pane: dataBrowserContext.session.paneRegistry.byName('schedule'),
        view: 'schedule',
        // predicate: ns.meeting('schedulingPoll'),
        // newBase: meetingBase + 'Schedule/',   Not needed as uses existing meeting
        tabTitle: 'Schedule poll',
        noIndexHTML: true
      }
      return makeNewPaneTool(toolObject, newPaneOptions)
    }

    const makePicturesFolder = function (folderName) {
      const toolObject = {
        icon: 'noun_598334.svg', // Slideshow @@ find a "picture" icon?
        limit: 1,
        shareTab: true // but many things behind it
      }
      const newPaneOptions = {
        newInstance: kb.sym(meeting.dir().uri + folderName + '/'),
        pane: dataBrowserContext.session.paneRegistry.byName('folder'), // @@ slideshow??
        predicate: ns.meeting('pictures'),
        shareTab: true,
        tabTitle: folderName,
        view: 'slideshow',
        noIndexHTML: true
      }
      return makeNewPaneTool(toolObject, newPaneOptions)
    }

    const makeMaterialsFolder = function (_folderName) {
      const toolObject = {
        icon: 'noun_681601.svg', // Document
        limit: 1,
        shareTab: true // but many things behind it
      }
      const options = {
        newInstance: kb.sym(meeting.dir().uri + 'Files/'),
        pane: dataBrowserContext.session.paneRegistry.byName('folder'),
        predicate: ns.meeting('materialsFolder'),
        tabTitle: 'Materials',
        noIndexHTML: true
      }
      return makeNewPaneTool(toolObject, options)
    }

    const makeParticipantsGroup = function () {
      const toolObject = {
        icon: 'noun_339237.svg', // Group of people
        limit: 1, // Only one tab
        shareTab: true // but many things behind it
      }
      const options = {
        newInstance: kb.sym(meeting.dir().uri + 'Attendees/index.ttl#this'),
        pane: dataBrowserContext.session.paneRegistry.byName('contact'),
        predicate: ns.meeting('attendeeGroup'),
        tabTitle: 'Attendees',
        instanceClass: ns.vcard('Group'),
        instanceName: UI.utils.label(subject) + ' attendees',
        noIndexHTML: true
      }

      return makeNewPaneTool(toolObject, options)
    }

    //   Make Pad for notes of meeting

    const makePad = function (toolObject) {
      const newPaneOptions = {
        newBase: meetingBase + 'SharedNotes/',
        predicate: UI.ns.meeting('sharedNotes'),
        tabTitle: 'Shared Notes',
        pane: dataBrowserContext.session.paneRegistry.byName('pad')
      }
      return makeNewPaneTool(toolObject, newPaneOptions)
    }

    //   Make Sub-meeting of meeting

    const makeMeeting = function (toolObject) {
      UI.widgets
        .askName(
          dom,
          kb,
          parameterCell,
          ns.foaf('name'),
          UI.ns.meeting('Meeting')
        )
        .then(function (name) {
          if (!name) {
            return resetTools()
          }
          const URIsegment = encodeURIComponent(name)
          const options = {
            newBase: meetingBase + URIsegment + '/', // @@@ sanitize
            predicate: UI.ns.meeting('subMeeting'),
            tabTitle: name,
            pane: dataBrowserContext.session.paneRegistry.byName('meeting')
          }
          return makeNewPaneTool(toolObject, options)
        })
        .catch(function (e) {
          complain('Error making new sub-meeting: ' + e)
        })
    }

    // Returns promise of newPaneOptions
    // In: options.
    //            me?, predicate, newInstance ?, newBase, instanceClass
    // out: options. the above plus
    //             me, newInstance

    function makeNewPaneTool (toolObject, options) {
      return new Promise(function (resolve, reject) {
        const kb = dataBrowserContext.session.store
        if (!options.useExisting) {
          // useExisting means use existing object in new role
          const existing = kb.any(meeting, options.predicate)
          if (existing) {
            if (
              toolObject.limit &&
              toolObject.limit === 1 &&
              !toolObject.shareTab
            ) {
              complain(
                'Already have ' +
                  existing +
                  ' as ' +
                  UI.utils.label(options.predicate)
              )
              complain('Cant have two')
              return resolve(null)
            }
            if (toolObject.shareTab) {
              // return existing one
              console.log(
                'Using existing ' +
                  existing +
                  ' as ' +
                  UI.utils.label(options.predicate)
              )
              return resolve({
                me,
                newInstance: existing,
                instanceClass: options.instanceClass
              })
            }
          }
        }
        if (!me && !options.me) { reject(new Error('Username not defined for new tool')) }
        options.me = options.me || me
        options.newInstance =
          options.useExisting ||
          options.newInstance ||
          kb.sym(options.newBase + 'index.ttl#this')

        options.pane
          .mintNew(dataBrowserContext, options)
          .then(function (options) {
            const tool = makeToolNode(
              options.newInstance,
              options.predicate,
              options.tabTitle,
              options.pane.icon
            )
            if (options.view) {
              kb.add(tool, UI.ns.meeting('view'), options.view, meetingDoc)
            }
            saveBackMeetingDoc()
            kb.fetcher
              .putBack(meetingDoc, { contentType: 'text/turtle' })
              .then(function (_xhr) {
                resolve(options)
              })
              .catch(function (err) {
                reject(err)
              })
          })
          .catch(function (err) {
            complain(err)
            reject(err)
          })
      })
    }

    const makeAgenda = function (_toolObject) {
      // selectTool(icon)
    }

    const makeActions = function (_toolObject) {
      const newBase = meetingBase + 'Actions/'
      const kb = dataBrowserContext.session.store
      if (kb.holds(meeting, ns.meeting('actions'))) {
        console.log('Ignored - already have actions')
        return // already got one
      }
      const appDoc = kb.sym(newBase + 'config.ttl')
      const newInstance = kb.sym(newBase + 'config.ttl#this')
      const stateStore = kb.sym(newBase + 'state.ttl')

      kb.add(
        newInstance,
        ns.dc('title'),
        (kb.anyValue(meeting, ns.cal('summary')) || 'Meeting ') + ' actions',
        appDoc
      )
      kb.add(newInstance, ns.wf('issueClass'), ns.wf('Task'), appDoc)
      kb.add(newInstance, ns.wf('initialState'), ns.wf('Open'), appDoc)
      kb.add(newInstance, ns.wf('stateStore'), stateStore, appDoc)
      kb.add(newInstance, ns.wf('assigneeClass'), ns.foaf('Person'), appDoc) // @@ set to people in the meeting?

      kb.add(newInstance, ns.rdf('type'), ns.wf('Tracker'), appDoc)

      // Flag its type in the chat itself as well as in the master meeting config file
      kb.add(newInstance, ns.rdf('type'), ns.wf('Tracker'), appDoc)
      const tool = makeToolNode(
        newInstance,
        ns.meeting('actions'),
        'Actions',
        UI.icons.iconBase + 'noun_17020.svg'
      )
      saveAppDocumentLinkAndAddNewThing(
        tool,
        newInstance,
        ns.meeting('actions')
      )
    }

    const makeChat = function (_toolObject) {
      const newBase = meetingBase + 'Chat/'
      const kb = dataBrowserContext.session.store
      if (kb.holds(meeting, ns.meeting('chat'))) {
        console.log('Ignored - already have chat')
        return // already got one
      }
      const messageStore = kb.sym(newBase + 'chat.ttl')

      kb.add(messageStore, ns.rdf('type'), ns.meeting('Chat'), messageStore)

      const tool = makeToolNode(
        messageStore,
        ns.meeting('chat'),
        'Chat',
        UI.icons.iconBase + 'noun_346319.svg'
      )
      saveAppDocumentLinkAndAddNewThing(tool, messageStore, ns.meeting('chat'))
    }

    const makeVideoCall = function (_toolObject) {
      const kb = dataBrowserContext.session.store
      const newInstance = $rdf.sym(VideoRoomPrefix + UI.utils.genUuid())

      if (kb.holds(meeting, ns.meeting('videoCallPage'))) {
        console.log('Ignored - already have a videoCallPage')
        return // already got one
      }
      kb.add(
        newInstance,
        ns.rdf('type'),
        ns.meeting('VideoCallPage'),
        meetingDoc
      )
      const tool = makeToolNode(
        newInstance,
        ns.meeting('videoCallPage'),
        'Video call',
        UI.icons.iconBase + 'noun_260227.svg'
      )
      kb.add(tool, ns.meeting('view'), 'iframe', meetingDoc)
      saveBackMeetingDoc()
    }

    const makeAttachment = function (_toolObject) {
      UI.widgets
        .askName(dom, kb, parameterCell, ns.log('uri'), UI.ns.rdf('Resource'))
        .then(function (uri) {
          if (!uri) {
            return resetTools()
          }
          const kb = dataBrowserContext.session.store
          const ns = UI.ns
          const target = kb.sym(uri)
          const tool = makeToolNode(
            target,
            ns.wf('attachment'),
            UI.utils.label(target),
            null
          )
          kb.add(tool, ns.meeting('view'), 'iframe', meetingDoc)
          saveBackMeetingDoc()
        })
        .catch(function (e) {
          complain('Error making new sub-meeting: ' + e)
        })
    }

    const makeSharing = function (toolObject) {
      const kb = dataBrowserContext.session.store
      const ns = UI.ns
      const target = meeting.dir()
      if (
        toolObject.limit &&
        toolObject.limit === 1 &&
        kb.holds(meeting, ns.wf('sharingControl'))
      ) {
        complain('Ignored - already have ' + UI.utils.label(options.predicate))
        return
      }
      const tool = makeToolNode(
        target,
        ns.wf('sharingControl'),
        'Sharing',
        UI.icons.iconBase + 'noun_123691.svg'
      )
      kb.add(tool, ns.meeting('view'), 'sharing', meetingDoc)
      saveBackMeetingDoc()
    }

    const makeNewMeeting = function () {
      // @@@ make option of continuing series
      const appDetails = { noun: 'meeting' }
      const gotWS = function (ws, base) {
        thisPane
          .mintNew(dataBrowserContext, { newBase: base })
          .then(function (options) {
            const newInstance = options.newInstance
            parameterCell.removeChild(mintUI)
            const p = parameterCell.appendChild(dom.createElement('p'))
            p.setAttribute('style', 'font-size: 140%;')
            p.innerHTML =
              'Your <a target=\'_blank\' href=\'' +
              newInstance.uri +
              '\'><b>new meeting</b></a> is ready to be set up. ' +
              '<br/><br/><a target=\'_blank\' href=\'' +
              newInstance.uri +
              '\'>Go to your new meeting.</a>'
          })
          .catch(function (err) {
            parameterCell.removeChild(mintUI)
            parameterCell.appendChild(UI.widgets.errorMessageBlock(dom, err))
          })
      }
      const mintUI = UI.login.selectWorkspace(dom, appDetails, gotWS)
      parameterCell.appendChild(mintUI)
    }

    // //////////////////////////////////////////////////////////// end of new tab creation functions

    const toolIcons = [
      {
        icon: 'noun_339237.svg',
        maker: makeGroup,
        hint: 'Make a group of people',
        limit: 1
      },
      {
        icon: 'noun_346777.svg',
        maker: makePoll,
        hint: 'Make a poll to schedule the meeting'
      }, // When meet THIS or NEXT time
      {
        icon: 'noun_48218.svg',
        maker: makeAgenda,
        limit: 1,
        hint: 'Add an agenda list',
        disabled: true
      }, // When meet THIS or NEXT time
      { icon: 'noun_79217.svg', maker: makePad, hint: 'Add a shared notepad' },
      {
        icon: 'noun_346319.svg',
        maker: makeChat,
        limit: 1,
        hint: 'Add a chat channel for the meeting'
      },
      {
        icon: 'noun_17020.svg',
        maker: makeActions,
        limit: 1,
        hint: 'Add a list of action items'
      }, // When meet THIS or NEXT time
      {
        icon: 'noun_260227.svg',
        maker: makeVideoCall,
        limit: 1,
        hint: 'Add a video call for the meeting'
      },
      {
        icon: 'noun_25830.svg',
        maker: makeAttachment,
        hint: 'Attach meeting materials',
        disabled: false
      },
      {
        icon: 'noun_123691.svg',
        maker: makeSharing,
        limit: 1,
        hint: 'Control Sharing',
        disabled: false
      },
      {
        icon: 'noun_66617.svg',
        maker: makeMeeting,
        hint: 'Make a sub meeting',
        disabled: false
      }
    ] // 'noun_66617.svg'

    const settingsForm = $rdf.sym(
      'https://solid.github.io/solid-panes/meeting/meetingDetailsForm.ttl#settings'
    )
    $rdf.parse(
      meetingDetailsFormText,
      kb,
      settingsForm.doc().uri,
      'text/turtle'
    ) // Load form directly

    const iconStyle = 'padding: 1em; width: 3em; height: 3em;'
    const iconCell = toolBar.appendChild(dom.createElement('td'))
    const parameterCell = toolBar.appendChild(dom.createElement('td'))
    const star = iconCell.appendChild(dom.createElement('img'))
    let visible = false // the inividual tools tools

    star.setAttribute('src', UI.icons.iconBase + 'noun_19460_green.svg') //  noun_272948.svg
    star.setAttribute('style', iconStyle + 'opacity: 50%;')
    star.setAttribute('title', 'Add another tool to the meeting')

    const selectNewTool = function (_event) {
      visible = !visible
      star.setAttribute(
        'style',
        iconStyle + (visible ? 'background-color: yellow;' : '')
      )
      styleTheIcons(visible ? '' : 'display: none;')
    }

    let loginOutButton
    logic.authn.checkUser().then(webId => {
      if (webId) {
        me = webId
        star.addEventListener('click', selectNewTool)
        star.setAttribute('style', iconStyle)
        return
      }

      loginOutButton = UI.login.loginStatusBox(dom, webIdUri => {
        if (webIdUri) {
          me = kb.sym(webIdUri)
          parameterCell.removeChild(loginOutButton)
          // loginOutButton.setAttribute('',iconStyle) // make it match the icons
          star.addEventListener('click', selectNewTool)
          star.setAttribute('style', iconStyle)
        } else {
          console.log('(Logged out)')
          me = null
        }
      })
      loginOutButton.setAttribute('style', 'margin: 0.5em 1em;')
      parameterCell.appendChild(loginOutButton)
    })

    const iconArray = []
    for (let i = 0; i < toolIcons.length; i++) {
      const foo = function () {
        const toolObject = toolIcons[i]
        const icon = iconCell.appendChild(dom.createElement('img'))
        icon.setAttribute('src', UI.icons.iconBase + toolObject.icon)
        icon.setAttribute('style', iconStyle + 'display: none;')
        iconArray.push(icon)
        icon.tool = toolObject
        const maker = toolObject.maker
        if (!toolObject.disabled) {
          icon.addEventListener('click', function (_event) {
            selectTool(icon)
            maker(toolObject)
          })
        }
      }
      foo()
    }

    const styleTheIcons = function (style) {
      for (let i = 0; i < iconArray.length; i++) {
        let st = iconStyle + style
        if (toolIcons[i].disabled) {
          st += 'opacity: 0.3;'
        }
        iconArray[i].setAttribute('style', st) // eg 'background-color: #ccc;'
      }
    }
    const resetTools = function () {
      styleTheIcons('display: none;')
      star.setAttribute('style', iconStyle)
    }

    const selectTool = function (icon) {
      styleTheIcons('display: none;') // 'background-color: #ccc;'
      icon.setAttribute('style', iconStyle + 'background-color: yellow;')
    }

    // //////////////////////////////

    const renderTab = function (div, item) {
      if (kb.holds(item, ns.rdf('type'), ns.meeting('Tool'))) {
        const target = kb.any(item, ns.meeting('target'))
        let label = kb.any(item, ns.rdfs('label'))
        label = label ? label.value : UI.utils.label(target)
        const s = div.appendChild(dom.createElement('div'))
        s.textContent = label
        s.setAttribute('style', 'margin-left: 0.7em')
        const icon = kb.any(item, ns.meeting('icon'))
        if (icon) {
          // Make sure the icon is cleanly on the left of the label
          const table = div.appendChild(dom.createElement('table'))
          const tr = table.appendChild(dom.createElement('tr'))
          const left = tr.appendChild(dom.createElement('td'))
          const right = tr.appendChild(dom.createElement('td'))
          // var img = div.appendChild(dom.createElement('img'))
          const img = left.appendChild(dom.createElement('img'))
          img.setAttribute('src', icon.uri)
          // img.setAttribute('style', 'max-width: 1.5em; max-height: 1.5em;') // @@ SVG shrinks to 0
          img.setAttribute('style', 'width: 1.5em; height: 1.5em;') // @
          img.setAttribute('title', label)
          right.appendChild(s)
        } else {
          div.appendChild(s)
        }
      } else {
        div.textContent = UI.utils.label(item)
      }
    }

    const tipDiv = function (text) {
      const d = dom.createElement('div')
      const p = d.appendChild(dom.createElement('p'))
      p.setAttribute('style', 'margin: 0em; padding:3em; color: #888;')
      p.textContent = 'Tip: ' + text
      return d
    }

    const renderTabSettings = function (containerDiv, subject) {
      containerDiv.innerHTML = ''
      containerDiv.style += 'border-color: #eed;'
      containerDiv.appendChild(dom.createElement('h3')).textContent =
        'Adjust this tab'
      if (kb.holds(subject, ns.rdf('type'), ns.meeting('Tool'))) {
        const form = $rdf.sym(
          'https://solid.github.io/solid-panes/meeting/meetingDetailsForm.ttl#settings'
        )
        UI.widgets.appendForm(
          document,
          containerDiv,
          {},
          subject,
          form,
          meeting.doc(),
          complainIfBad
        )
        const delButton = UI.widgets.deleteButtonWithCheck(
          dom,
          containerDiv,
          'tab',
          function () {
            const toolList = kb.the(meeting, ns.meeting('toolList'))
            for (let i = 0; i < toolList.elements.length; i++) {
              if (toolList.elements[i].sameTerm(subject)) {
                toolList.elements.splice(i, 1)
                break
              }
            }
            const target = kb.any(subject, ns.meeting('target'))
            const ds = kb
              .statementsMatching(subject)
              .concat(kb.statementsMatching(undefined, undefined, subject))
              .concat(kb.statementsMatching(meeting, undefined, target))
            kb.remove(ds) // Remove all links to and from the tab node
            saveBackMeetingDoc()
          }
        )
        delButton.setAttribute('style', 'width: 1.5em; height: 1.5em;')
        // delButton.setAttribute('class', '')
        // delButton.setAttribute('style', 'height: 2em; width: 2em; margin: 1em; border-radius: 0.5em; padding: 1em; font-size: 120%; background-color: red; color: white;')
        // delButton.textContent = 'Delete this tab'
      } else {
        containerDiv.appendChild(dom.createElement('h4')).textContent =
          '(No adjustments available)'
      }
    }

    const renderMain = function (containerDiv, subject) {
      let pane = null
      let table
      let selectedGroup = null
      containerDiv.innerHTML = ''
      const complainIfBad = function (ok, message) {
        if (!ok) {
          containerDiv.textContent = '' + message
        }
      }
      const showIframe = function (target) {
        const iframe = containerDiv.appendChild(dom.createElement('iframe'))
        // iframe.setAttribute('sandbox', '') // All restrictions
        iframe.setAttribute('src', target.uri)
        // See https://stackoverflow.com/questions/325273/make-iframe-to-fit-100-of-containers-remaining-height
        // Set the container position (sic) so it becaomes a 100% reference for the size of the iframe height 100%
        /*  For now at least , leave the container style as set by the tab system. 20200115b
        containerDiv.setAttribute(
          'style',
          'position: relative; top: 0px; left:0px; right:0px; resize: both; overflow:scroll; min-width: 30em; min-height: 30em;'
        )
        */
        // iframe.setAttribute('style', 'height: 350px; border: 0; margin: 0; padding: 0; resize:both; overflow:scroll; width: 100%;')
        // iframe.setAttribute('style', 'border: none; margin: 0; padding: 0; height: 100%; width: 100%; resize: both; overflow:scroll;')
        iframe.setAttribute(
          'style',
          'border: none; margin: 0; padding: 0; height: 100%; width: 100%;'
        )
        // Following https://dev.chromium.org/Home/chromium-security/deprecating-permissions-in-cross-origin-iframes :
        iframe.setAttribute('allow', 'microphone camera') // Allow iframe to request camera and mic
        // containerDiv.style.resize = 'none' // Remove scroll bars on outer div - don't seem to work so well
        iframe.setAttribute('name', 'disable-x-frame-options') // For electron: see https://github.com/electron/electron/pull/573
        containerDiv.style.padding = 0
      }
      const renderPeoplePicker = function () {
        const context = { div: containerDiv, dom }
        containerDiv.appendChild(dom.createElement('h4')).textContent =
          'Meeting Participants'
        const groupPickedCb = function (group) {
          const toIns = [
            $rdf.st(
              meeting,
              ns.meeting('particpantGroup'),
              group,
              meeting.doc()
            )
          ]
          kb.updater.update([], toIns, function (uri, ok, message) {
            if (ok) {
              selectedGroup = group
            } else {
              complain('Cant save participants group: ' + message)
            }
          })
        }
        selectedGroup = kb.any(meeting, ns.meeting('particpantGroup'))

        logic.createTypeIndexLogic.loadTypeIndexesFor(context).then(function () {
          // Assumes that the type index has an entry for addressbook
          const options = {
            defaultNewGroupName: 'Meeting Participants',
            selectedGroup
          }
          const picker = new UI.widgets.PeoplePicker(
            context.div,
            context.index.private[0],
            groupPickedCb,
            options
          )
          picker.render()
        })
      }

      const renderDetails = function () {
        containerDiv.appendChild(dom.createElement('h3')).textContent =
          'Details of meeting'
        const form = $rdf.sym(
          'https://solid.github.io/solid-panes/meeting/meetingDetailsForm.ttl#main'
        )
        UI.widgets.appendForm(
          document,
          containerDiv,
          {},
          meeting,
          form,
          meeting.doc(),
          complainIfBad
        )
        containerDiv.appendChild(
          tipDiv(
            'Drag URL-bar icons of web pages into the tab bar on the left to add new meeting materials.'
          )
        )
        me = logic.authn.currentUser()
        if (me) {
          kb.add(meeting, ns.dc('author'), me, meetingDoc) // @@ should nly be on initial creation?
        }
        const context = {
          noun: 'meeting',
          me,
          statusArea: containerDiv,
          div: containerDiv,
          dom
        }
        UI.login
          .registrationControl(context, meeting, ns.meeting('Meeting'))
          .then(function (_context) {
            console.log('Registration control finsished.')
          })
        const options = {}
        UI.pad.manageParticipation(
          dom,
          containerDiv,
          meetingDoc,
          meeting,
          me,
          options
        )

        // "Make a new meeting" button
        const imageStyle = 'height: 2em; width: 2em; margin:0.5em;'
        const detailsBottom = containerDiv.appendChild(dom.createElement('div'))
        const spawn = detailsBottom.appendChild(dom.createElement('img'))
        spawn.setAttribute('src', UI.icons.iconBase + 'noun_145978.svg')
        spawn.setAttribute('title', 'Make a fresh new meeting')
        spawn.addEventListener('click', makeNewMeeting)
        spawn.setAttribute('style', imageStyle)

        // "Fork me on Github" button
        const forka = detailsBottom.appendChild(dom.createElement('a'))
        forka.setAttribute('href', 'https://github.com/solid/solid-panes') // @@ Move when code moves
        forka.setAttribute('target', '_blank')
        const fork = forka.appendChild(dom.createElement('img'))
        fork.setAttribute('src', UI.icons.iconBase + 'noun_368567.svg')
        fork.setAttribute('title', 'Fork me on github')
        fork.setAttribute('style', imageStyle + 'opacity: 50%;')
      }

      if (kb.holds(subject, ns.rdf('type'), ns.meeting('Tool'))) {
        const target = kb.any(subject, ns.meeting('target'))
        if (target.sameTerm(meeting) && !kb.any(subject, ns.meeting('view'))) {
          // self reference? force details form
          renderDetails() // Legacy meeting instances
        } else {
          let view = kb.any(subject, ns.meeting('view'))
          view = view ? view.value : null
          if (view === 'details') {
            renderDetails()
          } else if (view === 'peoplePicker') {
            renderPeoplePicker()
          } else if (view === 'iframe') {
            showIframe(target)
          } else {
            pane = view
              ? dataBrowserContext.session.paneRegistry.byName(view)
              : null
            table = containerDiv.appendChild(dom.createElement('table'))
            table.style.width = '100%'
            dataBrowserContext
              .getOutliner(dom)
              .GotoSubject(target, true, pane, false, undefined, table)
          }
        }
      } else if (subject.sameTerm(meeting)) {
        // self reference? force details form
        renderDetails()
      } else if (
        subject.sameTerm(subject.doc()) &&
        !kb.holds(subject, UI.ns.rdf('type'), UI.ns.meeting('Chat')) &&
        !kb.holds(subject, UI.ns.rdf('type'), UI.ns.meeting('PaneView'))
      // eslint-disable-next-line no-empty
      ) { } else {
        table = containerDiv.appendChild(dom.createElement('table'))
        dataBrowserContext
          .getOutliner(dom)
          .GotoSubject(subject, true, undefined, false, undefined, table)
      }
    }

    const options = { dom }
    options.predicate = ns.meeting('toolList')
    options.subject = subject
    options.ordered = true
    options.orientation = 1 // tabs on LHS
    options.renderMain = renderMain
    options.renderTab = renderTab
    options.renderTabSettings = renderTabSettings
    options.backgroundColor =
      kb.anyValue(subject, ns.ui('backgroundColor')) || '#ddddcc'
    const tabs = mainTR.appendChild(UI.tabs.tabWidget(options))

    UI.aclControl.preventBrowserDropEvents(dom)

    UI.widgets.makeDropTarget(
      tabs.tabContainer,
      droppedURIHandler,
      droppedFileHandler
    )
    UI.widgets.makeDropTarget(iconCell, droppedURIHandler, droppedFileHandler)

    return div
  }
}
// ends

const electron = require('electron')
const moment = require('moment')
const helpers = require('./assets/helpers')
const ipc = electron.ipcRenderer

const app = window.app = {}

// aliases
app.send = ipc.send

// main fn
app.main = () => {
  console.time('main')
  app.dom()
  app.events()
  console.time('get-config')
  app.send('get-config')
  setTimeout(() => app.dom.registerTabs(), 80)
  console.timeEnd('main')
}

// helpers
app.normalizeFilter = (filter) => {
  return filter.replace(/([^a-z]+)/ig, '-')
}

// audio
app.audio = () => {
  app.audio.obj = new Audio(app.config.soundFile || 'assets/sounds/open-ended.mp3')
}

app.audio.play = () => {
  if (app.config.playSound) {
    app.audio.obj.play();
  }
}

// events
app.events = (event) => {
  app.events.on('config')
  app.events.on('line')
  app.events.on('error')
}

app.events.on = (event) => {
  ipc.on(event, app.events[event])
}

app.events.config = (event, data) => {
  console.timeEnd('get-config')
  app.config = data
  app.audio()

  if (!app.skipRender) {
    console.time('render')
    app.render()
    console.timeEnd('render')
  } else {
    app.skipRender = false
  }
}

app.events.line = (event, data) => {
  app.render.row(data)
  app.audio.play()
}

app.events.error = (event, err) => {
  console.log('error', err)
}

app.events.chatLogSelected = () => {
  app.config.logFile = app.dom.el.fileInput[0].files[0].path
  app.send('config', app.config)
}

app.events.addFilter = () => {
  let filter = app.dom.el.filterInput.val()
  app.send('add-filter', filter)
  app.dom.changeTab(filter)
}

app.events.removeFilter = (filter) => {
  app.dom.removeTab(filter)
  app.send('remove-filter', filter)
}

app.events.customSoundSelected = () => {
  if (app.dom.el.soundInput[0].files.length === 0) {
    app.config.soundFile = null
  } else {
    app.config.soundFile = app.dom.el.soundInput[0].files[0].path
  }

  app.send('config', app.config)
  app.render()
}

app.events.playSound = (state) => {
  app.config.playSound = state
  app.skipRender = true
  app.send('config', app.config)
}

app.events.tabNotifications = (state) => {
  app.config.tabNotifications = state
  app.skipRender = true
  app.send('config', app.config)
}

// dom
app.dom = () => {
  app.dom.cache()
  app.dom.events()
}

app.dom.cache = () => {
  app.dom.el = {}
  app.dom.el.doc = $(document)

  // menu
  app.dom.el.visibleTabs = '.menu .tab-item:visible'
  app.dom.el.welcome = $('[data-tab="welcome"]')
  app.dom.el.menu = $('.ui.menu.fixed')
  app.dom.el.add = $('.add-tab')
  app.dom.el.addModal = $('.add.modal')

  // filter input
  app.dom.el.filterInput = $('.filter-text')
  app.dom.el.filterSearch = $('.filter-search')

  // chat log
  app.dom.el.find = $('.find.button')
  app.dom.el.findInput = $('input.find')
  app.dom.el.fileInput = $('#file-input')

  // custom sound
  app.dom.el.clearSound = $('.clear-sound.button')
  app.dom.el.findSound = $('.sound.button')
  app.dom.el.findSoundInput = $('#findSound')
  app.dom.el.soundInput = $('#sound-input')

  // checkboxes
  app.dom.el.playSound = $('.play-sound')
  app.dom.el.tabNotifications = $('.tab-notifications')

  // template element selectors
  app.dom.el.copyWhisperBtn = '.copy-whisper'
  app.dom.el.removeFilterBtn = '.remove-filter'
  app.dom.el.filterTableInput = '.filter-table'

  // templates
  app.dom.templates = {}
  app.dom.templates.tab = app.dom.template('tab')
  app.dom.templates.tab_body = app.dom.template('tab_body')
  app.dom.templates.table_row = app.dom.template('table_row')
}

app.dom.on = (action, el, fn) => {
  app.dom.el.doc.on(action, app.dom.el[el], fn)
}

app.dom.events = () => {
  // modal
  app.dom.el.addModal
    .modal({ onApprove: app.events.addFilter })

  // on enter approve
  app.dom.el.filterInput.onEnter(() => {
    app.dom.el.addModal.find('.approve').click()
  })

  // add filter button
  app.dom.el.add.on('click', () => {
    if (!app.config.logFile) {
      return app.dom.el.find.transition('shake')
    }

    app.dom.el.addModal.modal('show')
  })

  // checkboxes
  app.dom.el.playSound
    .checkbox({
      onChecked: () => app.events.playSound(true),
      onUnchecked: () => app.events.playSound(false)
    })

  app.dom.el.tabNotifications
    .checkbox({
      onChecked: () => app.events.tabNotifications(true),
      onUnchecked: () => app.events.tabNotifications(false)
    })

  // input refs
  app.dom.el.findSoundInput.on('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    app.dom.el.soundInput.trigger('click')
  })

  app.dom.el.findSound.on('click', () => {
    app.dom.el.soundInput.trigger('click')
  })

  app.dom.el.findInput.on('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    app.dom.el.fileInput.trigger('click')
  })

  app.dom.el.find.on('click', () => {
    app.dom.el.fileInput.trigger('click')
  })

  // inputs
  app.dom.el.soundInput.on('change', app.events.customSoundSelected)
  app.dom.el.fileInput.on('change', app.events.chatLogSelected)

  // clear sound btn
  app.dom.el.clearSound.on('click', (e) => {
    app.dom.el.soundInput.clearFileInput()
    app.dom.el.soundInput.on('change', app.events.customSoundSelected)
    app.events.customSoundSelected()
  })

  // register tabs
  app.dom.on('click', 'visibleTabs', (e) => {
    app.dom.changeTab($(e.currentTarget))
  })

  // remove filter btn
  app.dom.on('click', 'removeFilterBtn', (e) => {
    let btn = $(e.currentTarget)
    let parent = btn.parents('.ui.tab')
    let filter = parent.attr('data-filter')

    app.events.removeFilter(filter)
  })

  // filter table
  app.dom.on('keyup', 'filterTableInput', (e) => {
    let table = $($(e.currentTarget).parents('.tab').find('table')[1]).DataTable()
    table.search(e.currentTarget.value).draw()
  })

  // copy whisper
  app.dom.on('click', 'copyWhisperBtn', (e) => {
    let btn = $(e.currentTarget)
    let btni = btn.find('i')
    let username = $(e.currentTarget).parents('tr').find('.name').text()

    if (username.indexOf('> ') > -1) {
      username = username.split('> ')[1]
    }

    app.send('copy', `@${username} `)
    btni.toggleClass('copy').toggleClass('check')

    btn.transition('jiggle', 500, () => {
      btni.toggleClass('copy').toggleClass('check')
    })
  })
}

app.dom.registerTabs = () => {
  if (!$('.tab-item.active:visible:not([data-tab="settings"])').length) {
    app.dom.changeTab($('.tab-item:visible:first'))
  }
}

app.dom.template = (id) => {
  let el = $($(`#${id}_template`).html())
  return () => el.clone()
}

app.dom.changeTab = (tab) => {
  $('.tab-item.active,.tab.active').removeClass('active')

  let els = $(`[data-tab="${tab.attr('data-tab')}"]`)
  els.addClass('active')

  $('.tab.active:not([data-tab="settings"])').scrollToBottom()
}

app.dom.hasTab = (name) => {
  return $(`[data-tab="${app.normalizeFilter(name)}"]`).length
}

app.dom.removeTab = (name) => {
  $(`[data-tab="${app.normalizeFilter(name)}"]`).remove()
}

// render
app.render = () => {
  if (app.config.logFile) {
    app.dom.el.welcome.hide()
    app.dom.el.findInput.val(app.config.logFile)
  } else {
    app.dom.el.findInput.val('')
  }

  if (app.config.soundFile) {
    app.dom.el.clearSound.show()
    app.dom.el.findSoundInput.val(app.config.soundFile)
  } else {
    app.dom.el.findSoundInput.val('')
    app.dom.el.clearSound.hide()
  }

  if (app.config.playSound) {
    app.dom.el.playSound.checkbox('check')
  }

  if (app.config.tabNotifications) {
    app.dom.el.tabNotifications.checkbox('check')
  }

  if (app.config.filters) {
    app.config.filters.forEach(app.render.filter)
  }
}

app.render.filter = (filter) => {
  if (app.dom.hasTab(filter)) return

  let tab = app.dom.templates.tab()
  let body = app.dom.templates.tab_body()

  body.attr('data-tab', app.normalizeFilter(filter))
  body.attr('data-filter', filter)
  tab.attr('data-tab', app.normalizeFilter(filter))
  tab.attr('data-filter', filter)
  
  tab.text(filter)

  body.removeAttr('data-hidden')
  tab.removeAttr('data-hidden')

  app.dom.el.add.before(tab)
  app.dom.el.menu.after(body)

  $(`[data-filter="${filter}"] table`).DataTable({
    scrollY: "calc(100vh - 50px - 15px - 41px - 190px)",
    scrollCollapse: true,
    paging: false,
    searching: true,
    dom: "<'ui stackable grid'"+
      "<'row dt-table'"+
          "<'sixteen wide column'tr>"+
      ">"+
      "<'row'"+
          "<'seven wide column'i>"+
          "<'right aligned nine wide column'p>"+
      ">"+
    ">"
  })
}

app.render.row = (data) => {
  let row = app.dom.templates.table_row()

  row.find('.date').text(moment(data.info.date._i).format('MM/DD/YY HH:mm:ss A'))
  row.find('.channel').text(data.info.channel)
  row.find('.name').text(data.info.username)
  row.find('.message').text(data.info.message)

  let parent = $(`[data-filter="${data.filter}"]`)
  let table = $(`[data-filter="${data.filter}"] table`).DataTable()

  table.row.add(row).draw()

  // if (parent.hasClass('active')) {
  //   parent.scrollToBottom()
  // }
}

// start
app.main()
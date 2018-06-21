const { app, BrowserWindow, clipboard, ipcMain: ipc } = require('electron')
const path = require('path')
const Monitor = require('./monitor').default
const Store = require('electron-store')
const config = new Store()

if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit()
}

let mainWindow
let chatLogs

function registerChatMonitor () {
  // clear previous monitor
  if (chatLogs != null) {
    chatLogs.tail.unwatch()
    chatLogs.tail = null
  }

  chatLogs = new Monitor(config.get('logFile'))

  config.get('filters', []).forEach(filter => {
    chatLogs.addFilter(filter)
  })

  chatLogs.on('line', (data) => {
    mainWindow.webContents.send('line', data)
  })

  chatLogs.on('error', (error) => {
    mainWindow.webContents.send('error', error)
  })
}

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, '..', '..', 'resources', 'icon.ico')
  })

  mainWindow.setMenu(null)
  mainWindow.loadURL(`file://${__dirname}/../renderer/index.html`)
  // mainWindow.webContents.openDevTools()

  if (config.store.logFile) {
    registerChatMonitor()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

ipc.on('get-config', () => {
  mainWindow.webContents.send('config', config.store || {})
})

ipc.on('copy', (event, data) => {
  clipboard.writeText(data)
})

ipc.on('config', (event, data) => {
  config.set(data)
  registerChatMonitor()
  mainWindow.webContents.send('config', config.store)
})

ipc.on('add-filter', (event, filter) => {
  chatLogs.addFilter(filter)
  config.set('filters', Array.from(chatLogs.filters).map(v => v.raw))
  mainWindow.webContents.send('config', config.store)
})

ipc.on('remove-filter', (event, filter) => {
  chatLogs.removeFilter(filter)
  config.set('filters', Array.from(chatLogs.filters).map(v => v.raw))
  mainWindow.webContents.send('config', config.store)
})
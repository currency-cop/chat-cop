const { Tail } = require('tail')
const moment = require('moment')

export default class Monitor {
  constructor (filename) {
    this.filename = filename
    this.events = {}
    this.filters = new Set([])
    this.tail = new Tail(this.filename, {
      useWatchFile: true
    })

    this.tail.on('line', (data) => this.processData(data))
    this.tail.on('error', (error) => this.fire('error', error))
  }

  on (event, callback) {
    this.events[event] = callback
  }

  fire (event, data) {
    this.events[event](data)
  }

  addFilter (filter) {
    this.filters.add({ raw: filter, exp: new RegExp(filter, 'i') })
  }

  removeFilter (filter) {
    this.filters.forEach(f => {
      if (f.raw === filter) {
        this.filters.delete(f)
      }
    })
  }

  processData (data) {
    if (data.indexOf('\n') > -1) {
      return data.split('\n').forEach(line => this.processData(line))
    }

    this.filters.forEach(filter => {
      if (filter && filter.exp.test(data)) {
        this.fire('line', {
          info: Monitor.getInfo(data),
          filter: filter.raw
        })

        filter.exp.lastIndex = 0
      }
    })
  }

  static getInfo (line) {
    let fragments = line.split(' ')
    let keys = Object.keys(Monitor.CHANNELS)
    let length = keys.length
    let channels = Monitor.CHANNELS
    let info = {}
    let i = 0

    info.date = moment(new Date(fragments[0] + ' ' + fragments[1]))
  
    for (; i < length; i++) {
      let key = keys[i]
      let substr = channels[key]
      if (line.indexOf(substr) > -1) {
        info.channel = key
        info.line = line.split(substr)[1]
        break
      }
    }

    fragments = info.line.split(':')

    info.username = fragments[0]
    info.message = fragments.slice(1).join('').trim()

    return info
  }
}

Monitor.CHANNELS = {
  GLOBAL: '] #',
  TRADE: '] $',
  WHISPER: '] @',
  LOCAL: '] '
}
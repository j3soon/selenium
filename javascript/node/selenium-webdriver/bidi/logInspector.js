// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

const { ConsoleLogEntry, JavascriptLogEntry, GenericLogEntry } = require('./logEntries')

const LOG = {
  TYPE_CONSOLE : 'console',
  TYPE_JS_LOGS : 'jsLogs',
  TYPE_JS_EXCEPTION: 'jsException',
  TYPE_LOG : 'log'
}

class LogInspector {
  bidi
  ws

  constructor (driver, browsingContextIds) {
    this._driver = driver
    this._browsingContextIds = browsingContextIds
    this.listener = {}
  }

  /**
   * Subscribe to log event
   * @returns {Promise<void>}
   */
  async init () {
    this.bidi = await this._driver.getBidi()
    await this.bidi.subscribe('log.entryAdded', this._browsingContextIds)
  }

  /**
   * @param kind
   */
  logListener (kind) {
    if (!(kind in this.listener)) {
      this.listener[kind] = []
    }
  }

  /**
   * Listen to Console logs
   * @param callback
   * @returns {Promise<void>}
   */
  async onConsoleEntry (callback) {
    this.ws = await this.bidi.socket
    let enabled = (LOG.TYPE_CONSOLE in this.listener) || this.logListener(LOG.TYPE_CONSOLE)
    this.listener[LOG.TYPE_CONSOLE].push(callback)

    if (enabled) {
      return
    }

    this.ws.on('message', event => {
      const { params } = JSON.parse(Buffer.from(event.toString()))

      if (params?.type === LOG.TYPE_CONSOLE) {
        let consoleEntry = new ConsoleLogEntry(params.level, params.text,
          params.timestamp, params.type, params.method, params.realm,
          params.args, params.stackTrace)

        this.listener[LOG.TYPE_CONSOLE].forEach(listener => {
          listener(consoleEntry)
        })
      }
    })
  }

  /**
   * Listen to JS logs
   * @param callback
   * @returns {Promise<void>}
   */
  async onJavascriptLog (callback) {
    this.ws = await this.bidi.socket
    let enabled = (LOG.TYPE_JS_LOGS in this.listener) || this.logListener(
      LOG.TYPE_JS_LOGS)
    this.listener[LOG.TYPE_JS_LOGS].push(callback)

    if (enabled) {
      return
    }

    this.ws.on('message', event => {
      const { params } = JSON.parse(Buffer.from(event.toString()))
      if ((params?.type === 'javascript')) {

        let jsEntry = new JavascriptLogEntry(params.level, params.text,
          params.timestamp, params.type, params.stackTrace)

        this.listener[LOG.TYPE_JS_LOGS].forEach(listener => {
          listener(jsEntry)
        })
      }
    })
  }

  /**
   * Listen to JS Exceptions
   * @param callback
   * @returns {Promise<void>}
   */
  async onJavascriptException (callback) {
    this.ws = await this.bidi.socket
    let enabled = (LOG.TYPE_JS_EXCEPTION in this.listener) || this.logListener(
      LOG.TYPE_JS_EXCEPTION)
    this.listener[LOG.TYPE_JS_EXCEPTION].push(callback)

    if (enabled) {
      return
    }

    this.ws.on('message', event => {
      const { params } = JSON.parse(Buffer.from(event.toString()))
      if ((params?.type === 'javascript') && (params?.level === 'error')) {

        let jsErrorEntry = new JavascriptLogEntry(params.level, params.text,
          params.timestamp, params.type, params.stackTrace)

        this.listener[LOG.TYPE_JS_EXCEPTION].forEach(listener => {
          listener(jsErrorEntry)
        })
      }
    })
  }

  /**
   * Listen to any logs
   * @param callback
   * @returns {Promise<void>}
   */
  async onLog (callback) {
    this.ws = await this.bidi.socket
    let enabled = (LOG.TYPE_LOG in this.listener) || this.logListener(
      LOG.TYPE_LOG)
    this.listener[LOG.TYPE_LOG].push(callback)

    if (enabled) {
      return
    }

    this.ws.on('message', event => {
      const { params } = JSON.parse(Buffer.from(event.toString()))
      if ((params?.type === 'javascript')) {

        let jsEntry = new JavascriptLogEntry(params.level, params.text,
          params.timestamp, params.type, params.stackTrace)

        this.listener[LOG.TYPE_LOG].forEach(listener => {
          listener(jsEntry)
        })
        return
      }
      
      if ((params?.type === 'console')) {

        let consoleEntry = new ConsoleLogEntry(params.level, params.text,
          params.timestamp, params.type, params.method, params.realm,
          params.args, params.stackTrace)

        this.listener[LOG.TYPE_LOG].forEach(listener => {
          listener(consoleEntry)
        })
        return
      } 

      if (params != undefined && !['console', 'javascript'].includes(params?.type)) {
        let genericEntry = new GenericLogEntry(params.level, params.text,
          params.timestamp, params.type, params.stackTrace)

        this.listener[LOG.TYPE_LOG].forEach(listener => {
          listener(genericEntry)
        })
      }
    })
  }


  /**
   * Unsubscribe to log event
   * @returns {Promise<void>}
   */
  async close () {
    await this.bidi.unsubscribe('log.entryAdded', this._browsingContextIds)
  }
}

/**
 * initiate inspector instance and return
 * @param driver
 * @param browsingContextIds
 * @returns {Promise<LogInspector>}
 */
async function getLogInspectorInstance (driver, browsingContextIds) {
  let instance = new LogInspector(driver, browsingContextIds)
  await instance.init()
  return instance
}

/**
 * API
 * @type {function(*, *): Promise<LogInspector>}
 */
module.exports = getLogInspectorInstance

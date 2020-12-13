/*
 * Copyright (c) 2020 Cynthia K. Rey, All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software without
 *    specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import { Plugin } from 'powercord/entities'
import { React, getModule, getModuleByDisplayName } from 'powercord/webpack'
import { inject as porkordInject, uninject as porkordUninject } from 'powercord/injector'
import { get as porkordFetch } from 'powercord/http'

import { extractFromFlux, extractMessages, extractUserPopOut, extractUserProfileBody, extractUserProfileInfo } from './modules.shared'
import { fetchPronouns, symbolHttp } from '../../fetch'
fetchPronouns[symbolHttp] = (url) =>
  porkordFetch(url)
    .set('x-pronoundb-source', 'Powercord (v0.0.0-unknown)')
    .then(r => r.body)
    .catch(() => ({}))

const injections = []
export function inject (mdl, meth, repl) {
  const iid = `pronoundb-${mdl.constructor.displayName || mdl.constructor.name}-${meth}`
  porkordInject(iid, mdl, meth, repl)
  injections.push(iid)
}

export function exporter (exp) {
  class PronounDB extends Plugin {
    startPlugin () {
      exp({
        get: (k, d) => this.settings.get(k, d),
        set: (k, v) => this.settings.set(k, v)
      })
    }

    pluginWillUnload () {
      injections.forEach(i => porkordUninject(i))
      const Message = getModule([ 'MESSAGE_ID_PREFIX' ], false)
      if (Message?.default.OriginalMessage) {
        Message.default = Message.default.OriginalMessage 
      }
    }
  }

  module.exports = PronounDB
}

export async function getModules () {
  const fnMessagesWrapper = await getModule(m => m.type?.toString().includes('getOldestUnreadMessageId'))
  const UserProfile = await getModuleByDisplayName('UserProfile')
  const fnUserPopOut = await getModuleByDisplayName('UserPopout')
  const FluxAppearance = await getModuleByDisplayName('FluxContainer(UserSettingsAppearance)')
  const MessageHeader = await getModule([ 'MessageTimestamp' ])
  const Message = await getModule([ 'MESSAGE_ID_PREFIX' ])
  const UserProfileBody = extractUserProfileBody(UserProfile)

  return {
    React,
    Message: Message,
    Messages: extractMessages(React, fnMessagesWrapper.type),
    MessageHeader,
    UserProfileBody,
    UserProfileInfo: extractUserProfileInfo(UserProfileBody),
    UserPopOut: extractUserPopOut(React, fnUserPopOut),
    AppearanceSettings: extractFromFlux(FluxAppearance)
  }
}

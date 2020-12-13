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

import { inject, exporter, getModules } from './modules.browser'
import { fetchPronouns, fetchPronounsBulk } from '../../fetch'

exporter(
  async function (settings) {
    const { React, Message, Messages, MessageHeader, AppearanceSettings, UserPopOut, UserProfileBody, UserProfileInfo } = await getModules()

    const PronounsWrapper = React.memo(
      props => {
        const [ allPronouns, setPronouns ] = React.useState({})
        React.useEffect(() => {
          const toFetch = [ ...new Set(props.items.filter(i => i.props.message && !i.props.message.author.bot).map(i => i.props.message.author.id)) ]
          fetchPronounsBulk('discord', toFetch).then(setPronouns)
        }, [ props.items ])

        const elements = React.useMemo(() => {
          const res = []
          for (const i of props.items) {
            const authorId = i.props.message?.author.id
            res.push(
              authorId && allPronouns[authorId]
                ? React.cloneElement(i, { __$pronouns: allPronouns[authorId] })
                : i
            )
          }
          return res
        }, [ props.items, allPronouns ])

        return React.createElement(React.Fragment, null, ...elements)
      }
    )

    inject(Messages, 'type', function (args, res) {
      const ogFn = res.props.children.props.children[1].props.children
      res.props.children.props.children[1].props.children = function (e) {
        const res = ogFn(e)
        const items = res.props.children.props.children[1]
        res.props.children.props.children[1] = React.createElement(PronounsWrapper, { items })
        return res
      }
      return res
    })

    const og = Message.default
    Message.default = React.memo(
      props => {
        const res = og.type(props)
        if (props.__$pronouns) {
          const og = res.props.childrenHeader.type
          res.props.childrenHeader.type = function (p) {
            const res = og.type(p)
            if (res.type !== 'span') {
              res.props.__$pronouns = props.__$pronouns
            }
            return res
          }
        }
        return res
      }
    )
    Message.default.OriginalMessage = og

    inject(MessageHeader, 'default', function ([ props ], res) {
      if (props.__$pronouns) {
        res.props.children[1].props.children.push(
          React.createElement('span', { style: { color: 'var(--text-muted)', fontSize: '.9rem', marginRight: props.compact ? '.6rem' : '' } }, ' • ', props.__$pronouns)
        )
      }
      return res
    })

    // Settings
    inject(AppearanceSettings.prototype, 'render', function (_, res) {
      const section = React.createElement(
        React.Fragment,
        null,
        React.cloneElement(res.props.children[3].props.children[0], { children: 'PronounDB settings' }),
        React.cloneElement(res.props.children[3].props.children[1], {
          children: 'Show pronouns in chat',
          disabled: false,
          value: settings.get('showInChat', true),
          onChange: v => settings.set('showInChat', v) | this.forceUpdate()
        })
      )
  
      res.props.children.splice(3, 0, section)
      return res
    })

    // User pop-out/profile
    function loadPronouns ([ prevProps ]) {
      if (!this.props.user || this.props.user.bot) return

      if (prevProps && this.props.user.id !== prevProps.user.id) {
        this.setState({ __$pronouns: null })
      }

      fetchPronouns('discord', this.props.user.id).then(pronouns => this.setState({ __$pronouns: pronouns }))
    }

    // State management
    inject(UserPopOut.prototype, 'componentDidMount', loadPronouns)
    inject(UserProfileBody.prototype, 'componentDidMount', loadPronouns)
    inject(UserProfileBody.prototype, 'componentDidUpdate', loadPronouns)

    // Render
    inject(UserPopOut.prototype, 'renderBody', function (_, res) {
      if (this.state?.__$pronouns) {
        res.props.children.props.children.push([
          React.createElement('div', { key: 'title', className: 'bodyTitle-Y0qMQz marginBottom8-AtZOdT size12-3R0845' }, 'Pronouns'),
          React.createElement('div', { key: 'pronouns', className: 'marginBottom8-AtZOdT size14-e6ZScH' }, this.state.__$pronouns)
        ])
      }
      return res
    })

    inject(UserProfileBody.prototype, 'render', function (_, res) {
      if (this.props.section === 'USER_INFO') {
        res.props.children.props.children[1].props.children.props.__$pronouns = this.state?.__$pronouns
      }
      return res
    })

    inject(UserProfileInfo.prototype, 'render', function (_, res) {
      if (this.props.__$pronouns) {
        res.props.children[0].props.children.push([
          React.createElement('div', { key: 'title', className: 'userInfoSectionHeader-CBvMDh' }, 'Pronouns'),
          React.createElement('div', { key: 'pronouns', className: 'marginBottom8-AtZOdT size14-e6ZScH colorStandard-2KCXvj' }, this.props.__$pronouns)
        ])
      }
      return res
    })
  }
)

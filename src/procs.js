module.exports = (App) => {
  App.search_wiki = (ox) => {
    if (!ox.arg) {
      App.process_feedback(ox.ctx, ox.data, `No search term provided.`)
      return false
    }

    let query = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(ox.arg)}`
    App.log(`Fetching Wikipedia: ${query}`)

    App.i.fetch(query)
      .then(res => {
        return res.json()
      })
      .then(res => {
        if (res.extract) {
          App.process_feedback(ox.ctx, ox.data, res.extract)
        }
      })
      .catch(err => {
        App.log(err.message, `error`)
      })
  }

  App.get_random_4chan_post = (ox) => {
    let boards = [`g`, `an`, `ck`, `lit`, `x`, `tv`, `v`, `fit`, `k`, `o`, `sci`, `his`]
    let board = boards[App.get_random_int(0, boards.length - 1)]
    let query = `https://a.4cdn.org/${board}/threads.json`
    App.log(`Fetching 4chan...`)

    App.i.fetch(query)
      .then(res => {
        return res.json()
      })
      .then(json => {
        let threads = json[`0`].threads
        let id = threads[App.get_random_int(0, threads.length - 1)].no
        let query = `https://a.4cdn.org/${board}/thread/${id}.json`

        App.log(`Fetching 4chan (2)...`)

        App.i.fetch(query)
          .then(res => {
            return res.json()
          })
          .then(json => {
            let posts = json.posts
            let post = posts[App.get_random_int(0, posts.length - 1)]
            let html = post.com

            if (!html) {
              return
            }

            let $ = App.i.cheerio.load(html)

            $(`.quotelink`).each((i, elem) => {
              $(elem).remove()
            })

            $(`br`).replaceWith(`\n`)

            let text = $.text().substring(0, 1000).trim()

            if (!text) {
              return
            }

            let url = `https://boards.4chan.org/${board}/thread/${id}`
            let ans = text + `\n` + url
            App.process_feedback(ox.ctx, ox.data, ans)
          })
          .catch(err => {
            App.log(err.message, `error`)
          })
      })
      .catch(err => {
        App.log(err.message, `error`)
      })
  }

  App.decide = (ox) => {
    if (!ox.arg) {
      App.process_feedback(ox.ctx, ox.data, `Give me a comma or space separated list to pick from.`)
      return
    }

    let split

    if (ox.arg.includes(`,`)) {
      split = ox.arg.split(`,`).map(x => x.trim())
    }
    else {
      split = ox.arg.split(` `).map(x => x.trim())
    }

    if (split.length < 2) {
      App.process_feedback(ox.ctx, ox.data, `Give me at least two options.`)
      return
    }

    let n = App.get_random_int(0, split.length - 1)
    App.process_feedback(ox.ctx, ox.data, split[n])
  }

  App.change_public = (ox) => {
    if (!ox.arg || ((ox.arg !== `on`) && (ox.arg !== `off`))) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} on|off`)
      return false
    }

    if (ox.arg === `on`) {
      if (App.db.options.public_commands) {
        App.process_feedback(ox.ctx, ox.data, `Public Commands are already on.`)
        return false
      }

      App.db.options.public_commands = true

      App.save_file(`options.json`, App.db.options, () => {
        App.process_feedback(ox.ctx, ox.data, `Public Commands are now on.`)
      })
    }
    else if (ox.arg === `off`) {
      if (!App.db.options.public_commands) {
        App.process_feedback(ox.ctx, ox.data, `Public Commands are already off.`)
        return false
      }

      App.db.options.public_commands = false

      App.save_file(`options.json`, App.db.options, () => {
        App.process_feedback(ox.ctx, ox.data, `Public Commands are now off.`)
      })
    }
  }

  App.say = (ox, whisper = false) => {
    if (!ox.arg) {
      return false
    }

    if (whisper) {
      App.send_whisper(ox.ctx, ox.data.username, ox.arg)
    }
    else {
      App.process_feedback(ox.ctx, ox.data, ox.arg)
    }
  }

  App.remind = (ox) => {
    if (!ox.arg) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} [username] > [message]`)
      return false
    }

    let split = ox.arg.split(`>`)

    if (split.length < 2) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} [username] > [message]`)
      return false
    }

    let username = split[0].trim()
    let message = split.slice(1).join(`>`).trim()

    if (username === ox.data.username) {
      App.process_feedback(ox.ctx, ox.data, `Self-reminders are not allowed.`)
      return false
    }

    if (!username || !message) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} [username] > [message]`)
      return false
    }

    if (App.db.reminders[username] === undefined) {
      App.db.reminders[username] = []
    }

    if (App.db.reminders[username].length >= 5) {
      App.process_feedback(ox.ctx, ox.data, `There are too many reminders for this user.`)
      return false
    }

    let m = {
      from: ox.data.username,
      message,
    }

    App.db.reminders[username].push(m)

    App.save_file(`reminders.json`, App.db.reminders, () => {
      App.process_feedback(ox.ctx, ox.data, `Reminder for ${username} saved.`)
      return false
    })
  }

  App.do_calculation = (ox) => {
    if (!ox.arg) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} [javascript math operation]`)
      return false
    }

    let r

    try {
      r = App.math.round(App.math.evaluate(ox.arg), 3).toString()
    }
    catch (err) {
      r = `Error`
    }

    App.process_feedback(ox.ctx, ox.data, r)
  }

  App.roll_dice = (ox) => {
    if (!ox.arg || !ox.arg.match(/^\d+d\d+$/)) {
      App.process_feedback(ox.ctx, ox.data, `Example format --> 2d6 (Roll a 6 sided die twice)`)
      return false
    }

    let split = ox.arg.split(`d`)
    let times = split[0]
    let max = split[1]
    let results = []

    if ((times > 10) || (max > 1000)) {
      return false
    }

    for (let i = 0; i < times; i++) {
      let num = App.get_random_int(1, max)
      results.push(num)
    }

    let ans = `Result: ${results.join(`, `)}`
    App.process_feedback(ox.ctx, ox.data, ans)
  }

  App.show_users = (ox) => {
    let s = App.list_items({
      data: ox.ctx.userlist.slice(0, 20),
      append: `,`,
      sort_mode: `random`,
    })

    App.process_feedback(ox.ctx, ox.data, s)
  }

  App.ping = (ox) => {
    let msg = `¡Ay, bendito! .ping? Pong! ¿Me buscaste? Pensé que estabas ocupado... admirando mi flow. Si no respondo rápido, es que estoy grabando un hit con Daddy Yankee. ¡Prepárate, que esto apenas comienza! 😎`
    App.process_feedback(ox.ctx, ox.data, msg)
  }

  App.check_rss = () => {
    if (!App.db.state.last_rss_urls) {
      App.db.state.last_rss_urls = {}
    }

    for (let item of App.db.config.rss_urls) {
      let split = item.split(` `)
      let url = split[0]
      let modes = split[1].split(`,`)

      if (!App.db.state.last_rss_urls[url]) {
        App.db.state.last_rss_urls[url] = `none`
      }

      App.log(`Fetching RSS: ${url}`)
      App.i.rss_parser.parseURL(url)
        .then(feed => {
          let date_1 = feed.items[0].isoDate

          if (date_1 && (App.db.state.last_rss_urls[url] !== date_1)) {
            for (let item of feed.items.slice(0, 3)) {
              let s = ``

              if (modes.includes(`text`)) {
                if (modes.includes(`bullet`)) {
                  s += `• `
                }

                s += item.contentSnippet.substring(0, 1000).replace(/\n/g, ` `).trim()
              }

              if (modes.includes(`link`)) {
                if (s) {
                  s += ` `
                }

                s += item.link
              }

              let date = item.isoDate

              if (s && date) {
                if (App.db.state.last_rss_urls[url] !== date) {
                  App.send_message_all_rooms(s)
                }
                else {
                  break
                }
              }
            }

            App.db.state.last_rss_urls[url] = date_1
            App.save_file(`state.json`, App.db.state)
          }
        })
        .catch(err => {
          App.log(err, `error`)
        })
    }
  }

  App.start_webserver = () => {
    if (!App.db.config.use_webserver) {
      return
    }

    App.webserver = App.i.express()

    App.webserver.get(`/show_message`, (req, res) => {
      if (req.query.message) {
        let text = req.query.message.trim()
        if (text) {
          App.send_message_all_rooms(text)
        }
      }

      res.send(`ok`)
    })

    let port = App.db.config.webserver_port

    App.webserver.listen(port, () => {
      App.log(`Web server started on port ${port}`)
    })
  }

  // Check RSS every x minutes
  App.start_rss_interval = () => {
    if (App.db.config.check_rss && App.db.config.check_rss_delay) {
      let mins = App.db.config.check_rss_delay
      let delay = mins * 1000 * 60

      if (isNaN(delay)) {
        App.log(`RSS delay is not a number`)
        return
      }

      setInterval(() => {
        if (Object.keys(App.connected_rooms).length === 0) {
          return
        }

        App.check_rss()
      }, delay)

      App.log(`RSS: ${mins} mins`)
    }
  }
}
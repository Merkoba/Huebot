module.exports = (App) => {
  // Check RSS every x minutes
  App.start_rss_interval = () => {
    clearInterval(App.rss_interval)

    if (App.db.config.rss_enabled && App.db.config.rss_delay) {
      let mins = App.db.config.rss_delay
      let delay = mins * 1000 * 60

      if (isNaN(delay)) {
        App.log(`RSS delay is not a number`)
        return
      }

      App.rss_interval = setInterval(() => {
        if (Object.keys(App.connected_rooms).length === 0) {
          return
        }

        App.check_rss()
      }, delay)

      App.log(`RSS: ${mins} mins`)
    }
  }

  App.check_rss = async () => {
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

      try {
        App.log(`Fetching RSS: ${url}`)
        let feed = await App.i.rss_parser.parseURL(url)
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
      }
      catch (err) {
        App.log(err.message, `error`)
      }
    }
  }
}
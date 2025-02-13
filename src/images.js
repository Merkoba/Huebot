module.exports = (App) => {
  App.change_image = async (ox, comment = ``) => {
    App.image_p = 0
    let query = App.do_replacements(ox.ctx, ox.arg)
    let instance = App.db.config.fourget
    let scraper = App.db.config.scraper
    let url = `${instance}/api/v1/images?s=${query}>&scraper=${scraper}`

    try {
      let res = await App.i.fetch(url)
      let json = await res.json()
      App.image_results = json.image
      App.next_image(ox, comment)
    }
    catch (err) {
      App.log(err.message, `error`)
    }
  }

  App.next_image = (ox, comment = ``) => {
    let src = ``
    let title = ``

    try {
      src = App.image_results[App.image_p].source[0].url
      title = App.image_results[App.image_p].title
    }
    catch (err) {
      return
    }

    App.image_p += 1

    App.change_media(ox.ctx, {
      type: `image`,
      src,
      comment: comment || title,
    })
  }

  App.change_image = async (ox, comment = ``) => {
    App.image_p = 0
    let query = App.do_replacements(ox.ctx, ox.arg)
    let instance = App.db.config.fourget
    let scraper = App.db.config.scraper
    let url = `${instance}/api/v1/images?s=${query}>&scraper=${scraper}`

    try {
      let res = await App.i.fetch(url)
      let json = await res.json()
      App.image_results = json.image
      App.next_image(ox, comment)
    }
    catch (err) {
      App.log(err.message, `error`)
    }
  }

  App.next_image = (ox, comment = ``) => {
    let src = ``
    let title = ``

    try {
      src = App.image_results[App.image_p].source[0].url
      title = App.image_results[App.image_p].title
    }
    catch (err) {
      return
    }

    App.image_p += 1

    App.change_media(ox.ctx, {
      type: `image`,
      src,
      comment: comment || title,
    })
  }

  App.set_image_source = (ctx, src) => {
    ctx.current_image_source = src
  }
}
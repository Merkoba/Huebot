module.exports = (App) => {
  App.change_tv = (ox, comment = ``) => {
    App.change_media(ox.ctx, {
      type: `tv`,
      src: ox.arg,
      comment,
    })
  }

  App.inv_tv = (ox, comment = ``) => {
    let ans = App.get_youtube_id(ox.ctx.current_tv_source)

    if (ans && ans[0] === `video`) {
      App.change_media(ox.ctx, {
        type: `tv`,
        src: `https://inv.nadeko.net/embed/${ans[1]}`,
        comment,
      })
    }
  }

  App.random = (ox) => {
    let query = `${ox.arg || ``} ${App.get_random_word()}`.trim()

    App.change_media(ox.ctx, {
      type: `tv`,
      src: query,
    })
  }

  App.get_random_stream = (ox) => {
    if (!App.db.config.youtube_enabled) {
      App.process_feedback(ox.ctx, ox.data, `No stream source support is enabled.`)
      return false
    }

    App.get_youtube_stream(ox.ctx)
  }

  App.suggest = (ox) => {
    let type = `tv`

    if (ox.arg) {
      if (ox.arg === `tv` || ox.arg === `image`) {
        type = ox.arg
      }
    }

    let suggestions = `Some ${type} suggestions: `

    for (let i = 0; i < App.config.num_suggestions; i++) {
      let words = `${App.get_random_word()} ${App.get_random_word()}`
      let s = `[whisper ${App.prefix}${type} ${words}]"${words}"[/whisper]`

      if (i < App.config.num_suggestions - 1) {
        s += `, `
      }

      suggestions += s
    }

    App.process_feedback(ox.ctx, ox.data, suggestions)
  }

  App.set_tv_source = (ctx, src) => {
    ctx.current_tv_source = src
  }

  App.tv_default = (s, media) => {
    if (!App.check_if_media(media)) {
      s = `tv ${s}`
    }

    return s
  }
}
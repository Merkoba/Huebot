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

    if (ans && (ans[0] === `video`)) {
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
      if ((ox.arg === `tv`) || (ox.arg === `image`)) {
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

  App.get_youtube_stream = async (ctx) => {
    try {
      App.log(`Fetching Youtube...`)
      let res = await App.i.fetch(`https://www.googleapis.com/youtube/v3/search?videoEmbeddable=true&maxResults=20&type=video&eventType=live&videoCategoryId=20&fields=items(id(videoId))&part=snippet&key=${App.db.config.youtube_client_id}`)
      let json = await res.json()

      if ((json.items !== undefined) && (json.items.length > 0)) {
        App.shuffle_array(json.items)
        let item

        for (item of json.items) {
          if (!ctx.recent_youtube_streams.includes(item.id.videoId)) {
            break
          }
        }

        let id = item.id.videoId
        ctx.recent_youtube_streams.push(id)

        if (ctx.recent_youtube_streams.length > App.config.recent_streams_max_length) {
          ctx.recent_youtube_streams.shift()
        }

        App.change_media(ctx, {
          type: `tv`,
          src: `https://youtube.com/watch?v=${id}`,
        })
      }
    }
    catch (err) {
      App.log(err)
    }
  }

  // Get id of youtube video from url
  App.get_youtube_id = (url) => {
    let v_id = false
    let list_id = false
    let split = url.split(/(vi\/|v%3D|v=|\/v\/|youtu\.be\/|\/embed\/)/)
    let id = undefined !== split[2] ? split[2].split(/[^0-9a-z_-]/i)[0] : split[0]
    v_id = id.length === 11 ? id : false
    let list_match = url.match(/(?:\?|&)(list=[0-9A-Za-z_-]+)/)
    let index_match = url.match(/(?:\?|&)(index=[0-9]+)/)

    if (list_match) {
      list_id = list_match[1].replace(`list=`, ``)
    }

    if (list_id && !v_id) {
      let index = 0

      if (index_match) {
        index = parseInt(index_match[1].replace(`index=`, ``)) - 1
      }

      return [`list`, [list_id, index]]
    }
    else if (v_id) {
      return [`video`, v_id]
    }
  }
}
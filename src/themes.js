module.exports = (App) => {
  App.manage_themes = (ox) => {
    let args = ox.arg.split(` `)

    if (!args[0]) {
      ox.arg = args.slice(1).join(` `)
      App.list_themes(ox)
    }
    else if (args[0] === `add`) {
      ox.arg = args.slice(1).join(` `)
      App.add_theme(ox)
    }
    else if (args[0] === `remove`) {
      ox.arg = args.slice(1).join(` `)
      App.remove_theme(ox)
    }
    else if (args[0] === `random`) {
      App.apply_random_theme(ox.ctx)
      App.start_auto_theme_interval()
    }
    else if (args[0] === `rename`) {
      ox.arg = args.slice(1).join(` `)
      App.rename_theme(ox)
    }
    else if (args[0] === `clear`) {
      ox.arg = ``
      App.clear_themes(ox)
    }
    else if (args[0] === `help`) {
      App.process_feedback(ox.ctx, ox.data, `[name] or: add, remove, rename, clear`)
    }
    else {
      App.apply_theme(ox)
      App.start_auto_theme_interval()
    }
  }

  App.add_theme = (ox) => {
    if (!ox.arg) {
      let regex = /^[a-z]+$/

      for (let i = 0; i < 100 ; i++) {
        let try_again = false
        let word = App.get_random_word().toLowerCase()

        if (!regex.test(word)) {
          continue
        }

        for (let key in App.db.themes) {
          if (key === word) {
            try_again = true
            break
          }
        }

        if (!try_again) {
          ox.arg = word
          break
        }
      }
    }

    let obj = {}
    obj.background_color = ox.ctx.background_color
    obj.text_color = ox.ctx.text_color
    obj.background = ox.ctx.background

    if (obj.background) {
      let bg_path = `${App.db.config.server_address}/static/room/${ox.ctx.room_id}/${obj.background}`
      let bg_ext = obj.background.split(`.`).pop()

      if (bg_ext) {
        App.download({
          url: bg_path,
          path: `backgrounds/${ox.arg}.${bg_ext}`,
          on_finish: () => {
            // Success
          },
          on_error: (err) => {
            App.log(err)
          },
        })
      }
    }

    App.do_theme_save(ox, obj)
  }

  App.do_theme_save = (ox, obj) => {
    App.db.themes[ox.arg] = obj

    App.save_file(`themes.json`, App.db.themes, () => {
      App.process_feedback(ox.ctx, ox.data, `Theme "${ox.arg}" successfully added.`)
    })
  }

  App.remove_theme = (ox) => {
    if (!ox.arg) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} remove [name]`)
      return false
    }

    if (App.db.themes[ox.arg] === undefined) {
      App.process_feedback(ox.ctx, ox.data, `Theme "${ox.arg}" doesn't exist.`)
      return false
    }

    delete App.db.themes[ox.arg]

    App.save_file(`themes.json`, App.db.themes, () => {
      App.process_feedback(ox.ctx, ox.data, `Theme "${ox.arg}" successfully removed.`)
    })
  }

  App.rename_theme = (ox) => {
    let split = ox.arg.split(` `)
    let old_name = split[0]
    let new_name = split[1]

    if (!ox.arg || split.length !== 2) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} rename [old_name] [new_name]`)
      return false
    }

    if (App.db.themes[old_name] === undefined) {
      App.process_feedback(ox.ctx, ox.data, `Theme "${old_name}" doesn't exist.`)
      return false
    }

    try {
      App.db.themes[new_name] = App.db.themes[old_name]

      delete App.db.themes[old_name]

      App.save_file(`themes.json`, App.db.themes, (err) => {
        App.process_feedback(ox.ctx, ox.data, `Theme "${old_name}" successfully renamed to "${new_name}".`)
      })
    }
    catch (err) {
      App.process_feedback(ox.ctx, ox.data, `Can't rename that theme.`)
      return false
    }
  }

  App.apply_theme = (ox) => {
    if (!App.is_admin_or_op(ox.ctx.role)) {
      return false
    }

    if (!ox.arg) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} [name]`)
      return false
    }

    let key = ox.arg
    let obj = App.db.themes[key]

    if (obj) {
      App.apply_theme_obj(ox.ctx, key, obj)
    }
    else {
      App.process_feedback(ox.ctx, ox.data, `Theme "${ox.arg}" doesn't exist.`)
    }
  }

  App.apply_theme_obj = (ctx, key, obj) => {
    obj.background_color = App.no_space(obj.background_color)
    obj.text_color = App.no_space(obj.text_color)

    if (obj.background_color.startsWith(`rgb`)) {
      obj.background_color = App.rgb_to_hex(obj.background_color)
    }

    if (obj.text_color.startsWith(`rgb`)) {
      obj.text_color = App.rgb_to_hex(obj.text_color)
    }

    if (obj.background_color && obj.background_color !== ctx.background_color) {
      App.socket_emit(ctx, `change_background_color`, {
        color: obj.background_color,
      })
    }

    if (obj.text_color && obj.text_color !== ctx.text_color) {
      App.socket_emit(ctx, `change_text_color`, {
        color: obj.text_color,
      })
    }

    App.i.fs.readdir(App.backgrounds_path, (err, files) => {
      if (err) {
        App.log(err, `error`)
        return
      }

      for (let file of files) {
        let name = file.split(`.`)[0]

        if (name === key) {
          let bg_path = App.i.path.join(App.backgrounds_path, file)
          App.upload_background(ctx, bg_path)
          break
        }
      }
    })
  }

  App.list_themes = (ox) => {
    let sort_mode = `random`

    if (ox.arg) {
      sort_mode = `sort`
    }

    let s = App.list_items({
      data: App.db.themes,
      filter: ox.arg,
      append: `,`,
      sort_mode,
      whisperify: `${App.prefix}theme `,
    })

    if (!s) {
      s = `No themes found.`
    }

    App.process_feedback(ox.ctx, ox.data, s)
  }

  App.clear_themes = (ox) => {
    if (!App.is_protected_admin(ox.data.username)) {
      return false
    }

    App.db.themes = {}

    App.save_file(`themes.json`, App.db.themes, () => {
      App.process_feedback(ox.ctx, ox.data, `Themes list successfully cleared.`)
    })
  }

  App.apply_random_theme = (ctx) => {
    let keys = Object.keys(App.db.themes)

    if (keys.length < 2) {
      return
    }

    if (App.last_random_theme) {
      keys = keys.filter(x => x !== App.last_random_theme)
    }

    let index = App.get_random_int(0, keys.length - 1)
    let next_key = keys[index]
    App.last_random_theme = next_key
    let obj = App.db.themes[next_key]
    App.apply_theme_obj(ctx, next_key, obj)
  }

  // Change theme every x minutes
  App.start_auto_theme_interval = () => {
    if (!App.db.config.auto_theme || !App.db.config.auto_theme_delay) {
      return
    }

    let mins = App.db.config.auto_theme_delay
    let delay = mins * 1000 * 60

    if (isNaN(delay)) {
      App.log(`Auto theme delay is not a number`)
      return
    }

    clearInterval(App.auto_theme_interval)

    App.auto_theme_interval = setInterval(() => {
      if (Object.keys(App.connected_rooms).length === 0) {
        return
      }

      for (let key in App.connected_rooms) {
        let ctx = App.connected_rooms[key].context
        App.apply_random_theme(ctx)
      }
    }, delay)

    App.log(`Auto Theme: ${mins} mins`)
  }

  App.set_theme = (ctx, data) => {
    ctx.background_color = data.background_color
    ctx.text_color_mode = data.text_color_mode
    ctx.text_color = data.text_color
  }
}
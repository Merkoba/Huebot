module.exports = (App) => {
  let math_config = {
    number: 'BigNumber',
    precision: 64
  }

  App.math = App.i.mathjs.create(App.i.mathjs.all, math_config)

  App.change_image = (ox, comment = ``) => {
    App.change_media(ox.ctx, {
      type: 'image',
      src: ox.arg,
      comment: comment
    })
  }

  App.change_tv = (ox, comment = ``) => {
    App.change_media(ox.ctx, {
      type: 'tv',
      src: ox.arg,
      comment: comment
    })
  }

  App.inv_tv = (ox, comment = ``) => {
    let ans = App.get_youtube_id(ox.ctx.current_tv_source)

    if (ans && ans[0] === `video`) {
      App.change_media(ox.ctx, {
        type: 'tv',
        src: `https://invidious.fdn.fr/embed/${ans[1]}`,
        comment: comment
      })
    }
  }

  App.ask_openai = async (ox) => {
    if (!App.db.config.openai_enabled || !ox.arg) {
      return
    }

    if (ox.arg.length > 300) {
      return
    }

    try {
      App.log(`Asking AI`)

      let ans = await App.openai_client.createCompletion({
        model: `text-davinci-003`,
        prompt: ox.arg,
        max_tokens: 200
      })

      if (ans.status === 200) {
        let text = ans.data.choices[0].text.trim()
        App.process_feedback(ox.ctx, ox.data, text)
      }
    }
    catch (err) {
      App.log(`openai completion error`, `error`)
    }
  }

  App.manage_commands = (ox) => {
    let args = ox.arg.split(` `)

    if (!args[0]) {
      ox.arg = args.slice(1).join(` `)
      App.list_custom_commands(ox)
    }
    else if (args[0] === `add`) {
      ox.arg = args.slice(1).join(` `)
      App.add_custom_command(ox)
    }
    else if (args[0] === `remove`) {
      ox.arg = args.slice(1).join(` `)
      App.remove_custom_command(ox)
    }
    else if (args[0] === `rename`) {
      ox.arg = args.slice(1).join(` `)
      App.rename_custom_command(ox)
    }
    else if (args[0] === `help`) {
      App.process_feedback(ox.ctx, ox.data, `[name] or: add, remove, rename, clear, random`)
    }
    else if (args[0] === `random`) {
      ox.arg = args.slice(1).join(` `)
      App.execute_random_custom_command(ox)
    }
    else if (args[0] === `clear`) {
      ox.arg = ``
      App.clear_custom_commands(ox)
    }
  }

  App.add_custom_command = (ox) => {
    let split = ox.arg.split(' ')
    let command_type = split[0]
    let command_name = split[1]
    let command_url = split.slice(2).join(` `)

    if (!ox.arg || split.length < 3 || (!App.config.media_types.includes(command_type))) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} add ${App.config.media_types.join(`|`)} [name] [url]`)
      return false
    }

    if (App.command_list.includes(command_name)) {
      App.process_feedback(ox.ctx, ox.data, `Command "${command_name}" is reserved.`)
      return false
    }

    let testobj = {}

    try {
      testobj[command_name] = {
        type: command_type,
        url: command_url
      }
      App.db.commands[command_name] = {
        type: command_type,
        url: command_url
      }

      App.save_file(`commands.json`, App.db.commands, (err) => {
        App.process_feedback(ox.ctx, ox.data, `Command "${command_name}" successfully set.`)
      })
    }
    catch (err) {
      App.process_feedback(ox.ctx, ox.data, `Can't save that command.`)
      return false
    }
  }

  App.remove_custom_command = (ox) => {
    if (!ox.arg) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} remove [name]`)
      return false
    }

    if (App.db.commands[ox.arg] === undefined) {
      App.process_feedback(ox.ctx, ox.data, `Command "${ox.arg}" doesn't exist.`)
      return false
    }

    delete App.db.commands[ox.arg]

    App.save_file(`commands.json`, App.db.commands, () => {
      App.process_feedback(ox.ctx, ox.data, `Command "${ox.arg}" successfully removed.`)
    })
  }

  App.rename_custom_command = (ox) => {
    let split = ox.arg.split(' ')
    let old_name = split[0]
    let new_name = split[1]

    if (!ox.arg || split.length !== 2) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} rename [old_name] [new_name]`)
      return false
    }

    if (App.db.commands[old_name] === undefined) {
      App.process_feedback(ox.ctx, ox.data, `Command "${old_name}" doesn't exist.`)
      return false
    }

    try {
      App.db.commands[new_name] = App.db.commands[old_name]

      delete App.db.commands[old_name]

      App.save_file(`commands.json`, App.db.commands, () => {
        App.process_feedback(ox.ctx, ox.data, `Command "${old_name}" successfully renamed to "${new_name}".`)
      })
    }
    catch (err) {
      App.process_feedback(ox.ctx, ox.data, `Can't rename that command.`)
      return false
    }
  }

  App.list_custom_commands = (ox) => {
    let sort_mode = `random`

    if (ox.arg) {
      sort_mode = `sort`
    }

    let cmds = Object.keys(App.db.commands)

    let s = App.list_items({
      data: cmds,
      filter: ox.arg,
      prepend: App.prefix,
      sort_mode: sort_mode,
      whisperify: `${App.prefix}`,
      mode: `commands`
    })

    if (!s) {
      s = `No commands found.`
    }

    App.process_feedback(ox.ctx, ox.data, s)
  }

  App.execute_random_custom_command = (ox) => {
    if (!ox.arg) {
      ox.arg = `tv`
    }

    if (!App.config.media_types.includes(ox.arg)) {
      return false
    }

    let cmds = Object.keys(App.db.commands)
    cmds = cmds.filter(x => App.db.commands[x].type === ox.arg)
    let c = cmds[App.get_random_int(0, cmds.length - 1)]

    if (c) {
      App.run_command(ox.ctx, c, ox.arg, ox.data)
    }
  }

  App.whatis_command = (ox) => {
    if (!ox.arg || ox.arg.split(` `).length > 1) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} [command_name]`)
      return false
    }

    if (App.command_list.includes(ox.arg)) {
      App.process_feedback(ox.ctx, ox.data, `${App.prefix}${ox.arg}: ${App.commands[ox.arg].description}`)
    }
    else {
      let command = App.db.commands[ox.arg]

      if (command) {
        App.process_feedback(ox.ctx, ox.data, `"${ox.arg}" is of type "${command.type}" and is set to "${safe_replacements(command.url)}".`)
      }
      else {
        App.process_feedback(ox.ctx, ox.data, `Command "${ox.arg}" doesn't exist.`)
      }
    }
  }

  App.manage_admins = (ox) => {
    let args = ox.arg.split(` `)

    if (!args[0]) {
      ox.arg = args.slice(1).join(` `)
      App.list_admins(ox)
    }
    else if (args[0] === `add`) {
      ox.arg = args.slice(1).join(` `)
      App.add_admin(ox)
    }
    else if (args[0] === `remove`) {
      ox.arg = args.slice(1).join(` `)
      App.remove_admin(ox)
    }
    else if (args[0] === `help`) {
      App.process_feedback(ox.ctx, ox.data, `[name] or: add, remove, clear`)
    }
    else if (args[0] === `clear`) {
      ox.arg = ``
      App.clear_admins(ox)
    }
  }

  App.add_admin = (ox) => {
    if (!App.is_protected_admin(ox.data.username)) {
      return false
    }

    if (!ox.arg) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} [username]`)
      return false
    }

    if (ox.arg === ox.data.username) {
      return false
    }

    if (!App.db.permissions.admins.includes(ox.arg)) {
      App.db.permissions.admins.push(ox.arg)

      App.save_file(`permissions.json`, App.db.permissions, (err) => {
        App.process_feedback(ox.ctx, ox.data, `Username "${ox.arg}" was successfully added as an admin.`)
      })
    }
  }

  App.remove_admin = (ox) => {
    if (!App.is_protected_admin(ox.data.username)) {
      return false
    }

    if (!ox.arg) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} [username]`)
      return false
    }

    if (ox.arg === ox.data.username) {
      return false
    }

    if (App.db.permissions.admins.includes(ox.arg)) {
      for (let i = 0; i < App.db.permissions.admins.length; i++) {
        let admin = App.db.permissions.admins[i]

        if (admin === ox.arg) {
          App.db.permissions.admins.splice(i, 1)
        }
      }

      App.save_file(`permissions.json`, App.db.permissions, (err) => {
        App.process_feedback(ox.ctx, ox.data, `Username "${ox.arg}" was successfully removed as an admin.`)
      })
    }
    else {
      App.process_feedback(ox.ctx, ox.data, `"${ox.arg}" is not an admin. Nothing to remove.`)
    }
  }

  App.list_admins = (ox) => {
    let sort_mode = `random`

    if (ox.arg) {
      sort_mode = `sort`
    }

    let s = App.list_items({
      data: App.db.permissions.admins,
      filter: ox.arg,
      append: `,`,
      sort_mode: sort_mode
    })

    if (!s) {
      s = `No admins found.`
    }

    App.process_feedback(ox.ctx, ox.data, s)
  }

  App.clear_admins = (ox) => {
    if (!App.is_protected_admin(ox.data.username)) {
      return false
    }

    App.db.permissions.admins = [ox.data.username]

    App.save_file(`permissions.json`, App.db.permissions, () => {
      App.process_feedback(ox.ctx, ox.data, `Admins list successfully cleared.`)
    })
  }

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
    }
  }

  App.add_theme = (ox) => {
    if (!ox.arg) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} add [name]`)
      return false
    }

    let obj = {}
    obj.background_color = ox.ctx.background_color
    obj.text_color = ox.ctx.text_color
    obj.background = ox.ctx.background

    if (ox.ctx.background_type === `hosted`) {
      if (App.db.config.server_url.includes(`localhost`)) {
        App.process_feedback(ox.ctx, ox.data, `Can't upload localhost image. Ignoring background image`)
        obj.background = ``
        App.do_theme_save(ox, obj)
        return
      }

      let bg_path = `${App.db.config.server_url}/static/room/${ox.ctx.room_id}/${obj.background}`
      App.process_feedback(ox.ctx, ox.data, `Uploading background image...`)

      App.i.imgur
      .uploadUrl(bg_path)
      .then((res) => {
        if (ox.ctx.background === obj.background) {
          ox.ctx.background = res.link
        }

        obj.background = res.link
        App.do_theme_save(ox, obj)

        App.socket_emit(ox.ctx, `change_background_source`, {
          src: obj.background
        })

        return
      })
      .catch((err) => {
        App.log(err.message, `error`)
        return
      })
    }
    else {
      App.do_theme_save(ox, obj)
    }
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
    let split = ox.arg.split(' ')
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

    let obj = App.db.themes[ox.arg]

    if (obj) {
      obj.background_color = App.no_space(obj.background_color)
      obj.text_color = App.no_space(obj.text_color)

      if (obj.background_color.startsWith(`rgb`)) {
        obj.background_color = App.rgb_to_hex(obj.background_color)
      }

      if (obj.text_color.startsWith(`rgb`)) {
        obj.text_color = App.rgb_to_hex(obj.text_color)
      }

      if (obj.background_color && obj.background_color !== ox.ctx.background_color) {
        App.socket_emit(ox.ctx, `change_background_color`, {
          color: obj.background_color
        })
      }

      if (obj.text_color && obj.text_color !== ox.ctx.text_color) {
        App.socket_emit(ox.ctx, `change_text_color`, {
          color: obj.text_color
        })
      }

      if (obj.background && obj.background !== ox.ctx.background) {
        App.socket_emit(ox.ctx, `change_background_source`, {
          src: obj.background
        })
      }
    }
    else {
      App.process_feedback(ox.ctx, ox.data, `Theme "${ox.arg}" doesn't exist.`)
    }
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
      sort_mode: sort_mode,
      whisperify: `${App.prefix}theme `
    })

    if (!s) {
      s = `No themes found.`
    }

    App.process_feedback(ox.ctx, ox.data, s)
  }

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
    let query = `https://a.4cdn.org/g/threads.json`
    App.log(`Fetching 4chan...`)

    App.i.fetch(query)
    .then(res => {
      return res.json()
    })
    .then(json => {
      let threads = json[`0`][`threads`]
      let id = threads[App.get_random_int(0, threads.length - 1)][`no`]
      let query = `https://a.4cdn.org/g/thread/${id}.json`

      App.log(`Fetching 4chan (2)...`)

      App.i.fetch(query)
      .then(res => {
        return res.json()
      })
      .then(json => {
        let posts = json[`posts`]
        let post = posts[App.get_random_int(0, posts.length - 1)]
        let html = post[`com`]

        if (!html) {
          return
        }

        let $ = App.i.cheerio.load(html)

        $(`.quotelink`).each((i, elem) => {
          $(elem).remove()
        })

        $(`br`).replaceWith(`\n`)

        let text = $.text().substring(0, 500).trim()

        if (!text) {
          return
        }

        App.process_feedback(ox.ctx, ox.data, text)
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
      split = ox.arg.split(' ').map(x => x.trim())
    }

    if (split.length < 2) {
      App.process_feedback(ox.ctx, ox.data, `Give me at least two options.`)
      return
    }

    let n = App.get_random_int(0, split.length - 1)
    App.process_feedback(ox.ctx, ox.data, split[n])
  }

  App.random = (ox) => {
    let query = `${ox.arg || ``} ${App.get_random_word()}`.trim()

    App.change_media(ox.ctx, {
      type: `tv`,
      src: query
    })
  }

  App.change_public = (ox) => {
    if (!ox.arg || (ox.arg !== `on` && ox.arg !== `off`)) {
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

  App.manage_queue = (ox) => {
    let args = ox.arg.split(` `)

    if (!args[0]) {
      App.process_feedback(ox.ctx, ox.data, `Correct format is --> ${App.prefix}${ox.cmd} url`)
      return false
    }

    if (args[0] !== `remove` && args[0] !== `play`) {
      ox.arg = App.tv_default(ox.arg, args[0])
      args = ox.arg.split(` `)
    }

    if (args[0] === `remove`) {
      App.remove_queue_item(ox)
    }
    else if (args[0] === `play`) {
      App.play_specific_queue_item(ox)
    }
    else if (args[1] === `next`) {
      App.next_in_queue(ox)
    }
    else if (args[1] === `clear`) {
      App.clear_queue(ox)
    }
    else if (args[1] === `size`) {
      App.get_queue_size(ox)
    }
    else if (args[1] === `list`) {
      App.list_queue(ox)
    }
    else if (args[1] === `help`) {
      App.process_feedback(ox.ctx, ox.data, `${App.prefix}${ox.cmd} url or next, size, list, clear`)
    }
    else {
      App.add_to_queue(ox)
    }
  }

  App.list_queue = (ox) => {
    let args = ox.arg.split(` `)
    let queue = App.db.queue[args[0]]
    let list = queue.slice(0, 5).map(x => x.url).join(`\n`)
    App.process_feedback(ox.ctx, ox.data, `${App.get_media_name(args[0])} queue:\n${list}`)
  }

  App.remove_queue_item = (ox) => {
    let args = ox.arg.split(` `)

    if (App.get_q_item(args[1], `delete`)) {
      if (args[2]) {
        App.delete_message(ox.ctx, args[2])
      }
    }
    else {
      App.process_feedback(ox.ctx, ox.data, `This was already played or removed.`)
    }
  }

  App.play_specific_queue_item = (ox) => {
    let args = ox.arg.split(` `)
    let item = App.get_q_item(args[1], `delete`)

    if (item) {
      if (args[2]) {
        App.delete_message(ox.ctx, args[2])
      }

      App.selective_play(ox.ctx, item.kind, item.url, `Selected by ${item.username}`)
      App.save_file(`queue.json`, App.db.queue)
    }
    else {
      App.process_feedback(ox.ctx, ox.data, `This was already played or removed.`)
    }
  }

  App.next_in_queue = (ox) => {
    let args = ox.arg.split(` `)

    if (App.db.queue[args[0]].length > 0) {
      if (Date.now() - ox.ctx[`q_${args[0]}_cooldown`] < 3000) {
        App.log(`Queue cooldown hit`)
        return false
      }

      let item = App.db.queue[args[0]].shift()

      if (typeof item !== `object`) {
        return
      }

      App.selective_play(ox.ctx, item.kind, item.url, `Selected by ${item.username}`)
      ox.ctx[`q_${args[0]}_cooldown`] = Date.now()
      App.save_file(`queue.json`, App.db.queue)
    }
    else {
      App.process_feedback(ox.ctx, ox.data, `${App.get_media_name(args[0])} queue is empty.`)
    }
  }

  App.clear_queue = (ox) => {
    let args = ox.arg.split(` `)

    if (App.db.queue[args[0]].length > 0) {
      App.db.queue[args[0]] = []

      App.save_file(`queue.json`, App.db.queue, () => {
        App.process_feedback(ox.ctx, ox.data, `${App.get_media_name(args[0])} queue successfully cleared.`)
      })
    }
    else {
      App.process_feedback(ox.ctx, ox.data, `${App.get_media_name(args[0])} queue was already cleared.`)
    }
  }

  App.get_queue_size = (ox) => {
    let args = ox.arg.split(` `)
    let n = App.db.queue[args[0]].length
    let s

    if (n === 1) {
      s = `item`
    }
    else {
      s = `items`
    }

    App.process_feedback(ox.ctx, ox.data, `${App.get_media_name(args[0])} queue has ${n} ${s}.`)
  }

  App.add_to_queue = (ox) => {
    let args = ox.arg.split(` `)

    if (App.db.queue[args[0]].includes(args[1])) {
      App.process_feedback(ox.ctx, ox.data, `That item is already in the ${args[0]} queue.`)
      return false
    }

    let obj = {}
    obj.kind = args[0]
    obj.url = args.slice(1).join(` `)
    obj.date = Date.now()
    obj.id = `${obj.kind}_${obj.date}_${App.get_random_string(4)}`
    obj.username = ox.data.username
    App.db.queue[args[0]].push(obj)

    App.save_file(`queue.json`, App.db.queue, () => {
      let links = `[whisper ${App.prefix}q remove ${obj.id} $id$]Remove[/whisper]`
      links += ` | [whisper ${App.prefix}q play ${obj.id} $id$]Play[/whisper]`
      let ans = `Done >> ${links}`
      App.process_feedback(ox.ctx, ox.data, ans)
    })
  }

  App.get_random_stream = (ox) => {
    if (!App.db.config.youtube_enabled) {
      App.process_feedback(ox.ctx, ox.data, `No stream source support is enabled.`)
      return false
    }

    App.get_youtube_stream(ox.ctx)
  }

  App.show_activity = (ox) => {
    let s = App.list_items({
      data: ox.ctx.user_command_activity.slice(0).reverse(),
      append: `,`
    })

    if (!s) {
      s = `No activity yet.`
    }

    App.process_feedback(ox.ctx, ox.data, `Recent command activity by: ${s}`)
  }

  App.clear_custom_commands = (ox) => {
    if (!App.is_protected_admin(ox.data.username)) {
      return false
    }

    App.db.commands = {}

    App.save_file(`commands.json`, App.db.commands, () => {
      App.process_feedback(ox.ctx, ox.data, `Commands list successfully cleared.`)
    })
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

  App.join_room = (ox) => {
    if (!App.is_protected_admin(ox.data.username)) {
      return false
    }

    if (!ox.arg) {
      App.process_feedback(ox.ctx, ox.data, `Argument must be a room ID.`)
      return false
    }

    if (App.connected_rooms[ox.arg] !== undefined) {
      App.process_feedback(ox.ctx, ox.data, `It seems I'm already in that room.`)
      return false
    }

    App.process_feedback(ox.ctx, ox.data, `Attempting to join that room!`)
    App.start_connection(ox.arg)
  }

  App.leave_room = (ox) => {
    if (!App.is_protected_admin(ox.data.username)) {
      return false
    }

    let context = ox.ctx

    if (ox.arg) {
      let room = App.connected_rooms[ox.arg]

      if (!room) {
        App.process_feedback(ox.ctx, ox.data, `It seems I'm not in that room.`)
        return false
      }

      context = room.context
    }

    App.process_feedback(context, ox.data, `Good bye!`)
    context.socket.disconnect()
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

  App.think = async (ox) => {
    let thought = await App.get_shower_thought()

    if(!thought) {
      return false
    }

    let ans = `${thought.title} [anchor ${thought.url}](Source)[/anchor]`

    if (ox.arg === `again`) {
      ox.data.method = `public`
    }

    App.process_feedback(ox.ctx, ox.data, ans)
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
      message: message
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

    if (times > 10 || max > 1000) {
      return false
    }

    for (let i = 0; i < times; i++) {
      let num = App.get_random_int(1, max)
      results.push(num)
    }

    let ans = `Result: ${results.join(', ')}`
    App.process_feedback(ox.ctx, ox.data, ans)
  }

  App.show_users = (ox) => {
    s = App.list_items({
      data: ox.ctx.userlist.slice(0, 20),
      append: `,`,
      sort_mode: `random`
    })

    App.process_feedback(ox.ctx, ox.data, s)
  }

  App.show_help = (ox) => {
    let items = App.command_list
    let s = ``

    s += App.list_items({
      data: items,
      prepend: App.prefix,
      append: ` `,
      sort_mode: `sort`,
      whisperify: `${App.prefix}whatis `,
      limit: false
    })

    App.send_whisper(ox.ctx, ox.data.username, s)
  }

  App.ping = (ox) => {
    App.process_feedback(ox.ctx, ox.data, `Pong`)
  }

  App.ask_wolfram = (ox) => {
    if (!App.db.config.wolfram_enabled || !ox.arg) {
      return
    }

    let query = `http://api.wolframalpha.com/v2/query?input=${encodeURIComponent(ox.arg)}&appid=${App.db.config.wolfram_id}&output=json&includepodid=Result&units=metric`
    App.log(`Fetching Wolfram: ${query}`)

    App.i.fetch(query)
    .then(res => {
      return res.json()
    })
    .then(res => {
      if (res.queryresult && res.queryresult.pods) {
        let result = res.queryresult.pods[0].subpods[0].plaintext
        App.process_feedback(ox.ctx, ox.data, result)
      }
    })
    .catch(err => {
      App.log(err.message, `error`)
    })
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
      rss_parser.parseURL(url)
      .then(feed => {
        let date_1 = feed.items[0].isoDate

        if (date_1 && App.db.state.last_rss_urls[url] !== date_1) {
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
}
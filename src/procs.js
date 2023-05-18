const MathJS = require(`mathjs`)
const fetch = require(`node-fetch`)
const imgur = require(`imgur`)
const cheerio = require(`cheerio`)
const Parser = require(`rss-parser`)
const rss_parser = new Parser()

module.exports = (Huebot) => {
  let math_config = {
    number: 'BigNumber',
    precision: 64
  }

  const math = MathJS.create(MathJS.all, math_config)

  Huebot.change_image = (ox, comment = ``) => {
    Huebot.change_media(ox.ctx, {
      type: 'image',
      src: ox.arg,
      comment: comment
    })
  }

  Huebot.change_tv = (ox, comment = ``) => {
    Huebot.change_media(ox.ctx, {
      type: 'tv',
      src: ox.arg,
      comment: comment
    })
  }

  Huebot.inv_tv = (ox, comment = ``) => {
    let ans = Huebot.get_youtube_id(ox.ctx.current_tv_source)

    if (ans && ans[0] === `video`) {
      Huebot.change_media(ox.ctx, {
        type: 'tv',
        src: `https://invidious.fdn.fr/embed/${ans[1]}`,
        comment: comment
      })
    }
  }

  Huebot.ask_openai = async (ox) => {
    if (!Huebot.db.config.openai_enabled || !ox.arg) {
      return
    }

    if (ox.arg.length > 300) {
      return
    }

    try {
      console.info(`Asking ai`)

      let ans = await Huebot.openai_client.createCompletion({
        model: `text-davinci-003`,
        prompt: ox.arg,
        max_tokens: 200
      })

      if (ans.status === 200) {
        let text = ans.data.choices[0].text.trim()
        Huebot.process_feedback(ox.ctx, ox.data, text)
      }
    }
    catch (err) {
      console.error(`openai completion error`)
    }
  }

  Huebot.manage_commands = (ox) => {
    let args = ox.arg.split(` `)

    if (!args[0]) {
      ox.arg = args.slice(1).join(` `)
      Huebot.list_custom_commands(ox)
    }
    else if (args[0] === `add`) {
      ox.arg = args.slice(1).join(` `)
      Huebot.add_custom_command(ox)
    }
    else if (args[0] === `remove`) {
      ox.arg = args.slice(1).join(` `)
      Huebot.remove_custom_command(ox)
    }
    else if (args[0] === `rename`) {
      ox.arg = args.slice(1).join(` `)
      Huebot.rename_custom_command(ox)
    }
    else if (args[0] === `help`) {
      Huebot.process_feedback(ox.ctx, ox.data, `[name] or: add, remove, rename, clear, random`)
    }
    else if (args[0] === `random`) {
      ox.arg = args.slice(1).join(` `)
      Huebot.execute_random_custom_command(ox)
    }
    else if (args[0] === `clear`) {
      ox.arg = ``
      Huebot.clear_custom_commands(ox)
    }
  }

  Huebot.add_custom_command = (ox) => {
    let split = ox.arg.split(' ')
    let command_type = split[0]
    let command_name = split[1]
    let command_url = split.slice(2).join(` `)

    if (!ox.arg || split.length < 3 || (!Huebot.config.media_types.includes(command_type))) {
      Huebot.process_feedback(ox.ctx, ox.data, `Correct format is --> ${Huebot.prefix}${ox.cmd} add ${Huebot.config.media_types.join(`|`)} [name] [url]`)
      return false
    }

    if (Huebot.command_list.includes(command_name)) {
      Huebot.process_feedback(ox.ctx, ox.data, `Command "${command_name}" is reserved.`)
      return false
    }

    let testobj = {}

    try {
      testobj[command_name] = {
        type: command_type,
        url: command_url
      }
      Huebot.db.commands[command_name] = {
        type: command_type,
        url: command_url
      }

      Huebot.save_file(`commands.json`, Huebot.db.commands, (err) => {
        Huebot.process_feedback(ox.ctx, ox.data, `Command "${command_name}" successfully set.`)
      })
    }
    catch (err) {
      Huebot.process_feedback(ox.ctx, ox.data, `Can't save that command.`)
      return false
    }
  }

  Huebot.remove_custom_command = (ox) => {
    if (!ox.arg) {
      Huebot.process_feedback(ox.ctx, ox.data, `Correct format is --> ${Huebot.prefix}${ox.cmd} remove [name]`)
      return false
    }

    if (Huebot.db.commands[ox.arg] === undefined) {
      Huebot.process_feedback(ox.ctx, ox.data, `Command "${ox.arg}" doesn't exist.`)
      return false
    }

    delete Huebot.db.commands[ox.arg]

    Huebot.save_file(`commands.json`, Huebot.db.commands, () => {
      Huebot.process_feedback(ox.ctx, ox.data, `Command "${ox.arg}" successfully removed.`)
    })
  }

  Huebot.rename_custom_command = (ox) => {
    let split = ox.arg.split(' ')
    let old_name = split[0]
    let new_name = split[1]

    if (!ox.arg || split.length !== 2) {
      Huebot.process_feedback(ox.ctx, ox.data, `Correct format is --> ${Huebot.prefix}${ox.cmd} rename [old_name] [new_name]`)
      return false
    }

    if (Huebot.db.commands[old_name] === undefined) {
      Huebot.process_feedback(ox.ctx, ox.data, `Command "${old_name}" doesn't exist.`)
      return false
    }

    try {
      Huebot.db.commands[new_name] = Huebot.db.commands[old_name]

      delete Huebot.db.commands[old_name]

      Huebot.save_file(`commands.json`, Huebot.db.commands, () => {
        Huebot.process_feedback(ox.ctx, ox.data, `Command "${old_name}" successfully renamed to "${new_name}".`)
      })
    }
    catch (err) {
      Huebot.process_feedback(ox.ctx, ox.data, `Can't rename that command.`)
      return false
    }
  }

  Huebot.list_custom_commands = (ox) => {
    let sort_mode = `random`

    if (ox.arg) {
      sort_mode = `sort`
    }

    let cmds = Object.keys(Huebot.db.commands)

    let s = Huebot.list_items({
      data: cmds,
      filter: ox.arg,
      prepend: Huebot.prefix,
      sort_mode: sort_mode,
      whisperify: `${Huebot.prefix}`,
      mode: `commands`
    })

    if (!s) {
      s = `No commands found.`
    }

    Huebot.process_feedback(ox.ctx, ox.data, s)
  }

  Huebot.execute_random_custom_command = (ox) => {
    if (!ox.arg) {
      ox.arg = `tv`
    }

    if (!Huebot.config.media_types.includes(ox.arg)) {
      return false
    }

    let cmds = Object.keys(Huebot.db.commands)
    cmds = cmds.filter(x => Huebot.db.commands[x].type === ox.arg)
    let c = cmds[Huebot.get_random_int(0, cmds.length - 1)]

    if (c) {
      Huebot.run_command(ox.ctx, c, ox.arg, ox.data)
    }
  }

  Huebot.whatis_command = (ox) => {
    if (!ox.arg || ox.arg.split(` `).length > 1) {
      Huebot.process_feedback(ox.ctx, ox.data, `Correct format is --> ${Huebot.prefix}${ox.cmd} [command_name]`)
      return false
    }

    if (Huebot.command_list.includes(ox.arg)) {
      Huebot.process_feedback(ox.ctx, ox.data, `${Huebot.prefix}${ox.arg}: ${Huebot.commands[ox.arg].description}`)
    }
    else {
      let command = Huebot.db.commands[ox.arg]

      if (command) {
        Huebot.process_feedback(ox.ctx, ox.data, `"${ox.arg}" is of type "${command.type}" and is set to "${safe_replacements(command.url)}".`)
      }
      else {
        Huebot.process_feedback(ox.ctx, ox.data, `Command "${ox.arg}" doesn't exist.`)
      }
    }
  }

  Huebot.manage_admins = (ox) => {
    let args = ox.arg.split(` `)

    if (!args[0]) {
      ox.arg = args.slice(1).join(` `)
      Huebot.list_admins(ox)
    }
    else if (args[0] === `add`) {
      ox.arg = args.slice(1).join(` `)
      Huebot.add_admin(ox)
    }
    else if (args[0] === `remove`) {
      ox.arg = args.slice(1).join(` `)
      Huebot.remove_admin(ox)
    }
    else if (args[0] === `help`) {
      Huebot.process_feedback(ox.ctx, ox.data, `[name] or: add, remove, clear`)
    }
    else if (args[0] === `clear`) {
      ox.arg = ``
      Huebot.clear_admins(ox)
    }
  }

  Huebot.add_admin = (ox) => {
    if (!Huebot.is_protected_admin(ox.data.username)) {
      return false
    }

    if (!ox.arg) {
      Huebot.process_feedback(ox.ctx, ox.data, `Correct format is --> ${Huebot.prefix}${ox.cmd} [username]`)
      return false
    }

    if (ox.arg === ox.data.username) {
      return false
    }

    if (!Huebot.db.permissions.admins.includes(ox.arg)) {
      Huebot.db.permissions.admins.push(ox.arg)

      Huebot.save_file(`permissions.json`, Huebot.db.permissions, (err) => {
        Huebot.process_feedback(ox.ctx, ox.data, `Username "${ox.arg}" was successfully added as an admin.`)
      })
    }
  }

  Huebot.remove_admin = (ox) => {
    if (!Huebot.is_protected_admin(ox.data.username)) {
      return false
    }

    if (!ox.arg) {
      Huebot.process_feedback(ox.ctx, ox.data, `Correct format is --> ${Huebot.prefix}${ox.cmd} [username]`)
      return false
    }

    if (ox.arg === ox.data.username) {
      return false
    }

    if (Huebot.db.permissions.admins.includes(ox.arg)) {
      for (let i = 0; i < Huebot.db.permissions.admins.length; i++) {
        let admin = Huebot.db.permissions.admins[i]

        if (admin === ox.arg) {
          Huebot.db.permissions.admins.splice(i, 1)
        }
      }

      Huebot.save_file(`permissions.json`, Huebot.db.permissions, (err) => {
        Huebot.process_feedback(ox.ctx, ox.data, `Username "${ox.arg}" was successfully removed as an admin.`)
      })
    }
    else {
      Huebot.process_feedback(ox.ctx, ox.data, `"${ox.arg}" is not an admin. Nothing to remove.`)
    }
  }

  Huebot.list_admins = (ox) => {
    let sort_mode = `random`

    if (ox.arg) {
      sort_mode = `sort`
    }

    let s = Huebot.list_items({
      data: Huebot.db.permissions.admins,
      filter: ox.arg,
      append: `,`,
      sort_mode: sort_mode
    })

    if (!s) {
      s = `No admins found.`
    }

    Huebot.process_feedback(ox.ctx, ox.data, s)
  }

  Huebot.clear_admins = (ox) => {
    if (!Huebot.is_protected_admin(ox.data.username)) {
      return false
    }

    Huebot.db.permissions.admins = [ox.data.username]

    Huebot.save_file(`permissions.json`, Huebot.db.permissions, () => {
      Huebot.process_feedback(ox.ctx, ox.data, `Admins list successfully cleared.`)
    })
  }

  Huebot.manage_themes = (ox) => {
    let args = ox.arg.split(` `)

    if (!args[0]) {
      ox.arg = args.slice(1).join(` `)
      Huebot.list_themes(ox)
    }
    else if (args[0] === `add`) {
      ox.arg = args.slice(1).join(` `)
      Huebot.add_theme(ox)
    }
    else if (args[0] === `remove`) {
      ox.arg = args.slice(1).join(` `)
      Huebot.remove_theme(ox)
    }
    else if (args[0] === `rename`) {
      ox.arg = args.slice(1).join(` `)
      Huebot.rename_theme(ox)
    }
    else if (args[0] === `clear`) {
      ox.arg = ``
      Huebot.clear_themes(ox)
    }
    else if (args[0] === `help`) {
      Huebot.process_feedback(ox.ctx, ox.data, `[name] or: add, remove, rename, clear`)
    }
    else {
      Huebot.apply_theme(ox)
    }
  }

  Huebot.add_theme = (ox) => {
    if (!ox.arg) {
      Huebot.process_feedback(ox.ctx, ox.data, `Correct format is --> ${Huebot.prefix}${ox.cmd} add [name]`)
      return false
    }

    let obj = {}
    obj.background_color = ox.ctx.background_color
    obj.text_color = ox.ctx.text_color
    obj.background = ox.ctx.background

    if (ox.ctx.background_type === `hosted`) {
      if (Huebot.db.config.server_url.includes(`localhost`)) {
        Huebot.process_feedback(ox.ctx, ox.data, `Can't upload localhost image. Ignoring background image`)
        obj.background = ``
        Huebot.do_theme_save(ox, obj)
        return
      }

      let bg_path = `${Huebot.db.config.server_url}/static/room/${ox.ctx.room_id}/${obj.background}`
      Huebot.process_feedback(ox.ctx, ox.data, `Uploading background image...`)

      imgur
      .uploadUrl(bg_path)
      .then((res) => {
        if (ox.ctx.background === obj.background) {
          ox.ctx.background = res.link
        }

        obj.background = res.link
        Huebot.do_theme_save(ox, obj)

        Huebot.socket_emit(ox.ctx, `change_background_source`, {
          src: obj.background
        })

        return
      })
      .catch((err) => {
        console.error(err.message)
        return
      })
    }
    else {
      Huebot.do_theme_save(ox, obj)
    }
  }

  Huebot.do_theme_save = (ox, obj) => {
    Huebot.db.themes[ox.arg] = obj

    Huebot.save_file(`themes.json`, Huebot.db.themes, () => {
      Huebot.process_feedback(ox.ctx, ox.data, `Theme "${ox.arg}" successfully added.`)
    })
  }

  Huebot.remove_theme = (ox) => {
    if (!ox.arg) {
      Huebot.process_feedback(ox.ctx, ox.data, `Correct format is --> ${Huebot.prefix}${ox.cmd} remove [name]`)
      return false
    }

    if (Huebot.db.themes[ox.arg] === undefined) {
      Huebot.process_feedback(ox.ctx, ox.data, `Theme "${ox.arg}" doesn't exist.`)
      return false
    }

    delete Huebot.db.themes[ox.arg]

    Huebot.save_file(`themes.json`, Huebot.db.themes, () => {
      Huebot.process_feedback(ox.ctx, ox.data, `Theme "${ox.arg}" successfully removed.`)
    })
  }

  Huebot.rename_theme = (ox) => {
    let split = ox.arg.split(' ')
    let old_name = split[0]
    let new_name = split[1]

    if (!ox.arg || split.length !== 2) {
      Huebot.process_feedback(ox.ctx, ox.data, `Correct format is --> ${Huebot.prefix}${ox.cmd} rename [old_name] [new_name]`)
      return false
    }

    if (Huebot.db.themes[old_name] === undefined) {
      Huebot.process_feedback(ox.ctx, ox.data, `Theme "${old_name}" doesn't exist.`)
      return false
    }

    try {
      Huebot.db.themes[new_name] = Huebot.db.themes[old_name]

      delete Huebot.db.themes[old_name]

      Huebot.save_file(`themes.json`, Huebot.db.themes, (err) => {
        Huebot.process_feedback(ox.ctx, ox.data, `Theme "${old_name}" successfully renamed to "${new_name}".`)
      })
    }
    catch (err) {
      Huebot.process_feedback(ox.ctx, ox.data, `Can't rename that theme.`)
      return false
    }
  }

  Huebot.apply_theme = (ox) => {
    if (!Huebot.is_admin_or_op(ox.ctx.role)) {
      return false
    }

    if (!ox.arg) {
      Huebot.process_feedback(ox.ctx, ox.data, `Correct format is --> ${Huebot.prefix}${ox.cmd} [name]`)
      return false
    }

    let obj = Huebot.db.themes[ox.arg]

    if (obj) {
      obj.background_color = Huebot.no_space(obj.background_color)
      obj.text_color = Huebot.no_space(obj.text_color)

      if (obj.background_color.startsWith(`rgb`)) {
        obj.background_color = Huebot.rgb_to_hex(obj.background_color)
      }

      if (obj.text_color.startsWith(`rgb`)) {
        obj.text_color = Huebot.rgb_to_hex(obj.text_color)
      }

      if (obj.background_color && obj.background_color !== ox.ctx.background_color) {
        Huebot.socket_emit(ox.ctx, `change_background_color`, {
          color: obj.background_color
        })
      }

      if (obj.text_color && obj.text_color !== ox.ctx.text_color) {
        Huebot.socket_emit(ox.ctx, `change_text_color`, {
          color: obj.text_color
        })
      }

      if (obj.background && obj.background !== ox.ctx.background) {
        Huebot.socket_emit(ox.ctx, `change_background_source`, {
          src: obj.background
        })
      }
    }
    else {
      Huebot.process_feedback(ox.ctx, ox.data, `Theme "${ox.arg}" doesn't exist.`)
    }
  }

  Huebot.list_themes = (ox) => {
    let sort_mode = `random`

    if (ox.arg) {
      sort_mode = `sort`
    }

    let s = Huebot.list_items({
      data: Huebot.db.themes,
      filter: ox.arg,
      append: `,`,
      sort_mode: sort_mode,
      whisperify: `${Huebot.prefix}theme `
    })

    if (!s) {
      s = `No themes found.`
    }

    Huebot.process_feedback(ox.ctx, ox.data, s)
  }

  Huebot.search_wiki = (ox) => {
    if (!ox.arg) {
      Huebot.process_feedback(ox.ctx, ox.data, `No search term provided.`)
      return false
    }

    let query = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(ox.arg)}`
    console.info(`Fetching Wikipedia: ${query}`)

    fetch(query)
    .then(res => {
      return res.json()
    })
    .then(res => {
      if (res.extract) {
        Huebot.process_feedback(ox.ctx, ox.data, res.extract)
      }
    })
    .catch(err => {
      console.error(err.message)
    })
  }

  Huebot.get_random_4chan_post = (ox) => {
    let query = `https://a.4cdn.org/g/threads.json`
    console.info(`Fetching 4chan...`)
    fetch(query)
    .then(res => {
      return res.json()
    })
    .then(json => {
      let threads = json[`0`][`threads`]
      let id = threads[Huebot.get_random_int(0, threads.length - 1)][`no`]
      let query = `https://a.4cdn.org/g/thread/${id}.json`

      console.info(`Fetching 4chan (2)...`)
      fetch(query)
      .then(res => {
        return res.json()
      })
      .then(json => {
        let posts = json[`posts`]
        let post = posts[Huebot.get_random_int(0, posts.length - 1)]
        let html = post[`com`]

        if (!html) {
          return
        }

        let $ = cheerio.load(html)

        $(`.quotelink`).each((i, elem) => {
          $(elem).remove()
        })

        $(`br`).replaceWith(`\n`)

        let text = $.text().substring(0, 500).trim()

        if (!text) {
          return
        }

        Huebot.process_feedback(ox.ctx, ox.data, text)
      })
      .catch(err => {
        console.error(err.message)
      })
    })
    .catch(err => {
      console.error(err.message)
    })
  }

  Huebot.decide = (ox) => {
    if (!ox.arg) {
      Huebot.process_feedback(ox.ctx, ox.data, `Give me a comma or space separated list to pick from.`)
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
      Huebot.process_feedback(ox.ctx, ox.data, `Give me at least two options.`)
      return
    }

    let n = Huebot.get_random_int(0, split.length - 1)
    Huebot.process_feedback(ox.ctx, ox.data, split[n])
  }

  Huebot.random = (ox) => {
    let query = `${ox.arg || ``} ${Huebot.get_random_word()}`.trim()

    Huebot.change_media(ox.ctx, {
      type: `tv`,
      src: query
    })
  }

  Huebot.change_public = (ox) => {
    if (!ox.arg || (ox.arg !== `on` && ox.arg !== `off`)) {
      Huebot.process_feedback(ox.ctx, ox.data, `Correct format is --> ${Huebot.prefix}${ox.cmd} on|off`)
      return false
    }

    if (ox.arg === `on`) {
      if (Huebot.db.options.public_commands) {
        Huebot.process_feedback(ox.ctx, ox.data, `Public Commands are already on.`)
        return false
      }

      Huebot.db.options.public_commands = true

      Huebot.save_file(`options.json`, Huebot.db.options, () => {
        Huebot.process_feedback(ox.ctx, ox.data, `Public Commands are now on.`)
      })
    }
    else if (ox.arg === `off`) {
      if (!Huebot.db.options.public_commands) {
        Huebot.process_feedback(ox.ctx, ox.data, `Public Commands are already off.`)
        return false
      }

      Huebot.db.options.public_commands = false

      Huebot.save_file(`options.json`, Huebot.db.options, () => {
        Huebot.process_feedback(ox.ctx, ox.data, `Public Commands are now off.`)
      })
    }
  }

  Huebot.manage_queue = (ox) => {
    let args = ox.arg.split(` `)

    if (!args[0]) {
      Huebot.process_feedback(ox.ctx, ox.data, `Correct format is --> ${Huebot.prefix}${ox.cmd} url`)
      return false
    }

    if (args[0] !== `remove` && args[0] !== `play`) {
      ox.arg = Huebot.tv_default(ox.arg, args[0])
      args = ox.arg.split(` `)
    }

    if (args[0] === `remove`) {
      Huebot.remove_queue_item(ox)
    }
    else if (args[0] === `play`) {
      Huebot.play_specific_queue_item(ox)
    }
    else if (args[1] === `next`) {
      Huebot.next_in_queue(ox)
    }
    else if (args[1] === `clear`) {
      Huebot.clear_queue(ox)
    }
    else if (args[1] === `size`) {
      Huebot.get_queue_size(ox)
    }
    else if (args[1] === `list`) {
      Huebot.list_queue(ox)
    }
    else if (args[1] === `help`) {
      Huebot.process_feedback(ox.ctx, ox.data, `${Huebot.prefix}${ox.cmd} url or next, size, list, clear`)
    }
    else {
      Huebot.add_to_queue(ox)
    }
  }

  Huebot.list_queue = (ox) => {
    let args = ox.arg.split(` `)
    let queue = Huebot.db.queue[args[0]]
    let list = queue.slice(0, 5).map(x => x.url).join(`\n`)
    Huebot.process_feedback(ox.ctx, ox.data, `${Huebot.get_media_name(args[0])} queue:\n${list}`)
  }

  Huebot.remove_queue_item = (ox) => {
    let args = ox.arg.split(` `)

    if (Huebot.get_q_item(args[1], `delete`)) {
      if (args[2]) {
        Huebot.delete_message(ox.ctx, args[2])
      }
    }
    else {
      Huebot.process_feedback(ox.ctx, ox.data, `This was already played or removed.`)
    }
  }

  Huebot.play_specific_queue_item = (ox) => {
    let args = ox.arg.split(` `)
    let item = Huebot.get_q_item(args[1], `delete`)

    if (item) {
      if (args[2]) {
        Huebot.delete_message(ox.ctx, args[2])
      }

      Huebot.selective_play(ox.ctx, item.kind, item.url, `Selected by ${item.username}`)
      Huebot.save_file(`queue.json`, Huebot.db.queue)
    }
    else {
      Huebot.process_feedback(ox.ctx, ox.data, `This was already played or removed.`)
    }
  }

  Huebot.next_in_queue = (ox) => {
    let args = ox.arg.split(` `)

    if (Huebot.db.queue[args[0]].length > 0) {
      if (Date.now() - ox.ctx[`q_${args[0]}_cooldown`] < 3000) {
        console.info(`Queue cooldown hit`)
        return false
      }

      let item = Huebot.db.queue[args[0]].shift()

      if (typeof item !== `object`) {
        return
      }

      Huebot.selective_play(ox.ctx, item.kind, item.url, `Selected by ${item.username}`)
      ox.ctx[`q_${args[0]}_cooldown`] = Date.now()
      Huebot.save_file(`queue.json`, Huebot.db.queue)
    }
    else {
      Huebot.process_feedback(ox.ctx, ox.data, `${Huebot.get_media_name(args[0])} queue is empty.`)
    }
  }

  Huebot.clear_queue = (ox) => {
    let args = ox.arg.split(` `)

    if (Huebot.db.queue[args[0]].length > 0) {
      Huebot.db.queue[args[0]] = []

      Huebot.save_file(`queue.json`, Huebot.db.queue, () => {
        Huebot.process_feedback(ox.ctx, ox.data, `${Huebot.get_media_name(args[0])} queue successfully cleared.`)
      })
    }
    else {
      Huebot.process_feedback(ox.ctx, ox.data, `${Huebot.get_media_name(args[0])} queue was already cleared.`)
    }
  }

  Huebot.get_queue_size = (ox) => {
    let args = ox.arg.split(` `)
    let n = Huebot.db.queue[args[0]].length
    let s

    if (n === 1) {
      s = `item`
    }
    else {
      s = `items`
    }

    Huebot.process_feedback(ox.ctx, ox.data, `${Huebot.get_media_name(args[0])} queue has ${n} ${s}.`)
  }

  Huebot.add_to_queue = (ox) => {
    let args = ox.arg.split(` `)

    if (Huebot.db.queue[args[0]].includes(args[1])) {
      Huebot.process_feedback(ox.ctx, ox.data, `That item is already in the ${args[0]} queue.`)
      return false
    }

    let obj = {}
    obj.kind = args[0]
    obj.url = args.slice(1).join(` `)
    obj.date = Date.now()
    obj.id = `${obj.kind}_${obj.date}_${Huebot.get_random_string(4)}`
    obj.username = ox.data.username
    Huebot.db.queue[args[0]].push(obj)

    Huebot.save_file(`queue.json`, Huebot.db.queue, () => {
      let links = `[whisper ${Huebot.prefix}q remove ${obj.id} $id$]Remove[/whisper]`
      links += ` | [whisper ${Huebot.prefix}q play ${obj.id} $id$]Play[/whisper]`
      let ans = `Done >> ${links}`
      Huebot.process_feedback(ox.ctx, ox.data, ans)
    })
  }

  Huebot.get_random_stream = (ox) => {
    if (!Huebot.db.config.youtube_enabled) {
      Huebot.process_feedback(ox.ctx, ox.data, `No stream source support is enabled.`)
      return false
    }

    Huebot.get_youtube_stream(ox.ctx)
  }

  Huebot.show_activity = (ox) => {
    let s = Huebot.list_items({
      data: ox.ctx.user_command_activity.slice(0).reverse(),
      append: `,`
    })

    if (!s) {
      s = `No activity yet.`
    }

    Huebot.process_feedback(ox.ctx, ox.data, `Recent command activity by: ${s}`)
  }

  Huebot.clear_custom_commands = (ox) => {
    if (!Huebot.is_protected_admin(ox.data.username)) {
      return false
    }

    Huebot.db.commands = {}

    Huebot.save_file(`commands.json`, Huebot.db.commands, () => {
      Huebot.process_feedback(ox.ctx, ox.data, `Commands list successfully cleared.`)
    })
  }

  Huebot.clear_themes = (ox) => {
    if (!Huebot.is_protected_admin(ox.data.username)) {
      return false
    }

    Huebot.db.themes = {}

    Huebot.save_file(`themes.json`, Huebot.db.themes, () => {
      Huebot.process_feedback(ox.ctx, ox.data, `Themes list successfully cleared.`)
    })
  }

  Huebot.say = (ox, whisper = false) => {
    if (!ox.arg) {
      return false
    }

    if (whisper) {
      Huebot.send_whisper(ox.ctx, ox.data.username, ox.arg)
    }
    else {
      Huebot.process_feedback(ox.ctx, ox.data, ox.arg)
    }
  }

  Huebot.join_room = (ox) => {
    if (!Huebot.is_protected_admin(ox.data.username)) {
      return false
    }

    if (!ox.arg) {
      Huebot.process_feedback(ox.ctx, ox.data, `Argument must be a room ID.`)
      return false
    }

    if (Huebot.connected_rooms[ox.arg] !== undefined) {
      Huebot.process_feedback(ox.ctx, ox.data, `It seems I'm already in that room.`)
      return false
    }

    Huebot.process_feedback(ox.ctx, ox.data, `Attempting to join that room!`)
    Huebot.start_connection(ox.arg)
  }

  Huebot.leave_room = (ox) => {
    if (!Huebot.is_protected_admin(ox.data.username)) {
      return false
    }

    let context = ox.ctx

    if (ox.arg) {
      let room = Huebot.connected_rooms[ox.arg]

      if (!room) {
        Huebot.process_feedback(ox.ctx, ox.data, `It seems I'm not in that room.`)
        return false
      }

      context = room.context
    }

    Huebot.process_feedback(context, ox.data, `Good bye!`)
    context.socket.disconnect()
  }

  Huebot.suggest = (ox) => {
    let type = `tv`

    if (ox.arg) {
      if (ox.arg === `tv` || ox.arg === `image`) {
        type = ox.arg
      }
    }

    let suggestions = `Some ${type} suggestions: `

    for (let i = 0; i < Huebot.config.num_suggestions; i++) {
      let words = `${Huebot.get_random_word()} ${Huebot.get_random_word()}`
      let s = `[whisper ${Huebot.prefix}${type} ${words}]"${words}"[/whisper]`

      if (i < Huebot.config.num_suggestions - 1) {
        s += `, `
      }

      suggestions += s
    }

    Huebot.process_feedback(ox.ctx, ox.data, suggestions)
  }

  Huebot.think = async (ox) => {
    let thought = await Huebot.get_shower_thought()

    if(!thought) {
      return false
    }

    let ans = `${thought.title} [anchor ${thought.url}](Source)[/anchor]`

    if (ox.arg === `again`) {
      ox.data.method = `public`
    }

    Huebot.process_feedback(ox.ctx, ox.data, ans)
  }

  Huebot.remind = (ox) => {
    if (!ox.arg) {
      Huebot.process_feedback(ox.ctx, ox.data, `Correct format is --> ${Huebot.prefix}${ox.cmd} [username] > [message]`)
      return false
    }

    let split = ox.arg.split(`>`)

    if (split.length < 2) {
      Huebot.process_feedback(ox.ctx, ox.data, `Correct format is --> ${Huebot.prefix}${ox.cmd} [username] > [message]`)
      return false
    }

    let username = split[0].trim()
    let message = split.slice(1).join(`>`).trim()

    if (username === ox.data.username) {
      Huebot.process_feedback(ox.ctx, ox.data, `Self-reminders are not allowed.`)
      return false
    }

    if (!username || !message) {
      Huebot.process_feedback(ox.ctx, ox.data, `Correct format is --> ${Huebot.prefix}${ox.cmd} [username] > [message]`)
      return false
    }

    if (Huebot.db.reminders[username] === undefined) {
      Huebot.db.reminders[username] = []
    }

    if (Huebot.db.reminders[username].length >= 5) {
      Huebot.process_feedback(ox.ctx, ox.data, `There are too many reminders for this user.`)
      return false
    }

    let m = {
      from: ox.data.username,
      message: message
    }

    Huebot.db.reminders[username].push(m)

    Huebot.save_file(`reminders.json`, Huebot.db.reminders, () => {
      Huebot.process_feedback(ox.ctx, ox.data, `Reminder for ${username} saved.`)
      return false
    })
  }

  Huebot.do_calculation = (ox) => {
    if (!ox.arg) {
      Huebot.process_feedback(ox.ctx, ox.data, `Correct format is --> ${Huebot.prefix}${ox.cmd} [javascript math operation]`)
      return false
    }

    let r

    try {
      r = math.round(math.evaluate(ox.arg), 3).toString()
    }
    catch (err) {
      r = `Error`
    }

    Huebot.process_feedback(ox.ctx, ox.data, r)
  }

  Huebot.roll_dice = (ox) => {
    if (!ox.arg || !ox.arg.match(/^\d+d\d+$/)) {
      Huebot.process_feedback(ox.ctx, ox.data, `Example format --> 2d6 (Roll a 6 sided die twice)`)
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
      let num = Huebot.get_random_int(1, max)
      results.push(num)
    }

    let ans = `Result: ${results.join(', ')}`
    Huebot.process_feedback(ox.ctx, ox.data, ans)
  }

  Huebot.show_users = (ox) => {
    s = Huebot.list_items({
      data: ox.ctx.userlist.slice(0, 20),
      append: `,`,
      sort_mode: `random`
    })

    Huebot.process_feedback(ox.ctx, ox.data, s)
  }

  Huebot.show_help = (ox) => {
    let items = Huebot.command_list
    let s = ``

    s += Huebot.list_items({
      data: items,
      prepend: Huebot.prefix,
      append: ` `,
      sort_mode: `sort`,
      whisperify: `${Huebot.prefix}whatis `,
      limit: false
    })

    Huebot.send_whisper(ox.ctx, ox.data.username, s)
  }

  Huebot.ping = (ox) => {
    Huebot.process_feedback(ox.ctx, ox.data, `Pong`)
  }

  Huebot.ask_wolfram = (ox) => {
    if (!Huebot.db.config.wolfram_enabled || !ox.arg) {
      return
    }

    let query = `http://api.wolframalpha.com/v2/query?input=${encodeURIComponent(ox.arg)}&appid=${Huebot.db.config.wolfram_id}&output=json&includepodid=Result&units=metric`
    console.info(`Fetching Wolfram: ${query}`)

    fetch(query)
    .then(res => {
      return res.json()
    })
    .then(res => {
      if (res.queryresult && res.queryresult.pods) {
        let result = res.queryresult.pods[0].subpods[0].plaintext
        Huebot.process_feedback(ox.ctx, ox.data, result)
      }
    })
    .catch(err => {
      console.error(err.message)
    })
  }

  Huebot.check_rss = () => {
    if (!Huebot.db.state.last_rss_urls) {
      Huebot.db.state.last_rss_urls = {}
    }

    for (let item of Huebot.db.config.rss_urls) {
      let split = item.split(` `)
      let url = split[0]
      let modes = split[1].split(`,`)

      if (!Huebot.db.state.last_rss_urls[url]) {
        Huebot.db.state.last_rss_urls[url] = `none`
      }

      console.info(`Fetching RSS: ${url}`)
      rss_parser.parseURL(url)
      .then(feed => {
        let date_1 = feed.items[0].isoDate

        if (date_1 && Huebot.db.state.last_rss_urls[url] !== date_1) {
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
              if (Huebot.db.state.last_rss_urls[url] !== date) {
                Huebot.send_message_all_rooms(s)
              }
              else {
                break
              }
            }
          }

          Huebot.db.state.last_rss_urls[url] = date_1
          Huebot.save_file(`state.json`, Huebot.db.state)
        }
      })
      .catch(err => {
        console.error(err)
      })
    }
  }
}
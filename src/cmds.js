module.exports = (App) => {
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
    let split = ox.arg.split(` `)
    let command_type = split[0]
    let command_name = split[1]
    let command_url = split.slice(2).join(` `)

    if (!ox.arg || split.length < 3 || !App.config.media_types.includes(command_type)) {
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
        url: command_url,
      }
      App.db.commands[command_name] = {
        type: command_type,
        url: command_url,
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
    let split = ox.arg.split(` `)
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
      sort_mode,
      whisperify: `${App.prefix}`,
      mode: `commands`,
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
        App.process_feedback(ox.ctx, ox.data, `"${ox.arg}" is of type "${command.type}" and is set to "${App.safe_replacements(command.url)}".`)
      }
      else {
        App.process_feedback(ox.ctx, ox.data, `Command "${ox.arg}" doesn't exist.`)
      }
    }
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

  App.run_command = (ctx, cmd, arg, data) => {
    let command = App.db.commands[cmd]

    if (command.type === `image`) {
      App.change_media(ctx, {
        type: `image`,
        src: command.url,
        comment: data.comment,
      })
    }
    else if (command.type === `tv`) {
      App.change_media(ctx, {
        type: `tv`,
        src: command.url,
        comment: data.comment,
      })
    }
  }
}
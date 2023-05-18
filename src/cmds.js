module.exports = (App) => {
  App.commands = {
    image: {
      aliases: [`img`, `i`],
      description: `Change the image`,
      public: false,
      exec: (ox) => {
        App.change_image(ox)
      }
    },
    tv: {
      aliases: [`yt`, `video`, `v`],
      description: `Change the tv`,
      public: false,
      exec: (ox) => {
        App.change_tv(ox)
      }
    },
    commands: {
      description: `Manage commands`,
      public: false,
      exec: (ox) => {
        App.manage_commands(ox)
      }
    },
    add: {
      description: `Shortcut to add a tv command`,
      public: false,
      exec: (ox) => {
        if (ox.arg.split(` `).length < 2) {
          App.process_feedback(ox.ctx, ox.data, `Correct format --> .add [name] [url]`)
          return
        }
        ox.arg = `add tv ${ox.arg}`
        App.manage_commands(ox)
      }
    },
    q: {
      description: `Manage the queue`,
      public: true,
      exec: (ox) => {
        App.manage_queue(ox)
      }
    },
    next: {
      description: `Shortcut for queue (next tv item)`,
      public: true,
      exec: (ox) => {
        ox.arg = `next`
        App.manage_queue(ox)
      }
    },
    adminadd: {
      description: `Add a bot admin`,
      public: false,
      exec: (ox) => {
        App.add_admin(ox)
      }
    },
    adminremove: {
      description: `Remove a bot admin`,
      public: false,
      exec: (ox) => {
        App.remove_admin(ox)
      }
    },
    admins: {
      description: `List admins`,
      public: false,
      exec: (ox) => {
        App.manage_admins(ox)
      }
    },
    themes: {
      description: `Manage themes`,
      public: false,
      exec: (ox) => {
        App.manage_themes(ox)
      }
    },
    stream: {
      description: `Put a random video stream`,
      public: false,
      exec: (ox) => {
        App.get_random_stream(ox)
      }
    },
    activity: {
      description: `Show recent bot users`,
      public: false,
      exec: (ox) => {
        App.show_activity(ox)
      }
    },
    clearadmins: {
      description: `Remove all bot admins`,
      public: false,
      exec: (ox) => {
        App.clear_admins(ox)
      }
    },
    help: {
      description: `Show a summary of commands`,
      public: true,
      exec: (ox) => {
        App.show_help(ox)
      }
    },
    ping: {
      description: `Returns a Pong`,
      public: false,
      exec: (ox) => {
        App.ping(ox)
      }
    },
    whatis: {
      description: `Inspects a command`,
      public: true,
      exec: (ox) => {
        App.whatis_command(ox)
      }
    },
    say: {
      description: `Make the bot say something`,
      public: false,
      exec: (ox) => {
        App.say(ox)
      }
    },
    say2: {
      description: `Make the bot say something through a whisper`,
      public: false,
      exec: (ox) => {
        App.say(ox, true)
      }
    },
    random: {
      description: `Random video. Optional keyword for semi-random search`,
      public: true,
      exec: (ox) => {
        App.random(ox)
      }
    },
    leave: {
      description: `Leave the room`,
      public: false,
      exec: (ox) => {
        App.leave_room(ox)
      }
    },
    join: {
      description: `Join a room`,
      public: false,
      exec: (ox) => {
        App.join_room(ox)
      }
    },
    sleep: {
      description: `Wait before executing the next command (ms)`,
      public: false,
      exec: undefined
    },
    suggest: {
      description: `Suggest topics`,
      public: false,
      exec: (ox) => {
        App.suggest(ox)
      }
    },
    think: {
      description: `Get a random showerthought`,
      public: false,
      exec: (ox) => {
        App.think(ox)
      }
    },
    public: {
      description: `Enable or disable public commands`,
      public: false,
      exec: (ox) => {
        App.change_public(ox)
      }
    },
    remind: {
      description: `Remind a message to a user when they become active`,
      public: false,
      exec: (ox) => {
        App.remind(ox)
      }
    },
    calc: {
      description: `Make a math calculation`,
      public: true,
      exec: (ox) => {
        App.do_calculation(ox)
      }
    },
    roll: {
      description: `Simulate a dice`,
      public: true,
      exec: (ox) => {
        App.roll_dice(ox)
      }
    },
    users: {
      description: `List connected users`,
      public: true,
      exec: (ox) => {
        App.show_users(ox)
      }
    },
    decide: {
      description: `Decide on multiple options`,
      public: true,
      exec: (ox) => {
        App.decide(ox)
      }
    },
    wiki: {
      description: `Define something using wikipedia`,
      public: true,
      exec: (ox) => {
        App.search_wiki(ox)
      }
    },
    wolfram: {
      description: `Ask Wolfram something`,
      public: true,
      exec: (ox) => {
        App.ask_wolfram(ox)
      }
    },
    shitpost: {
      description: `Random board post`,
      public: false,
      exec: (ox) => {
        App.get_random_4chan_post(ox)
      }
    },
    debug: {
      description: `Used for dev debugging`,
      public: false,
      exec: (ox) => {}
    },
    inv: {
      description: `Change youtube tv to Invidious version`,
      public: true,
      exec: (ox) => {App.inv_tv(ox)}
    },
    ai: {
      description: `Ask something to openai`,
      public: false,
      exec: (ox) => {App.ask_openai(ox)}
    },
  }

  App.command_list = []
  App.public_command_list = []

  for (let key in App.commands) {
    App.command_list.push(key)

    if (App.commands[key].public) {
      App.public_command_list.push(key)
    }
  }

  App.command_list.sort()

  // Must Include:
  // data.message
  // data.username
  // data.method
  // Optional:
  // data.callback
  App.process_command = (ctx, data) => {
    let allowed = false
    let split = data.message.split(' ')
    let cmd = split[0]
    let arg

    if (split.length > 1) {
      cmd += ' '
      arg = App.single_space(split.slice(1).join(` `))
    }
    else {
      arg = ``
    }

    cmd = cmd.substring(1).trim()

    if (!App.is_admin(data.username)) {
      if (App.db.options.public_commands) {
        if (App.public_command_list.includes(cmd)) {
          allowed = true
        }
        else {
          let cmd2 = App.db.commands[cmd]

          if (cmd2) {
            if (cmd2.type === `image` || cmd2.type === `tv`) {
              allowed = true
            }
          }
        }
      }

      if (!allowed) {
        if (data.callback) {
          return data.callback()
        }
        else {
          return false
        }
      }
    }
    else {
      allowed = true
    }

    ctx.user_command_activity.push(data.username)

    if (ctx.user_command_activity.length > App.config.max_user_command_activity) {
      ctx.user_command_activity.shift()
    }

    if (data.message.includes(` && `)) {
      if (cmd !== `commands`) {
        let full_cmd = `${cmd} ${arg}`
        let and_split = full_cmd.split(` && `)

        if (and_split.length > 1) {
          let cmds = []

          for (let i = 0; i < and_split.length; i++) {
            let item = and_split[i]
            let c = item.trim()
            let cc
            let c2

            if (!c.startsWith(App.prefix)) {
              cc = App.prefix + c
              c2 = c
            }
            else {
              cc = c
              c2 = c.substring(1)
            }

            let acmd = App.db.commands[c2]

            if (acmd !== undefined) {
              let spc = acmd.url.split(` `)[0]

              if (App.command_list.includes(spc)) {
                cc = App.prefix + acmd.url
              }
            }

            cmds.push(cc)
          }

          let qcmax = 0
          let cqid

          while (true) {
            cqid = App.get_random_string(5) + Date.now()

            if (ctx.commands_queue[cqid] === undefined) {
              break
            }

            qcmax += 1

            if (qcmax >= 100) {
              if (data.callback) {
                return data.callback()
              }
              else {
                return false
              }
            }
          }

          ctx.commands_queue[cqid] = {}
          ctx.commands_queue[cqid].username = data.username
          ctx.commands_queue[cqid].method = data.method
          ctx.commands_queue[cqid].commands = cmds

          App.run_commands_queue(ctx, cqid)

          if (data.callback) {
            return data.callback()
          }
          else {
            return false
          }
        }
      }
    }

    App.execute_command(ctx, data, cmd, arg)

    if (data.callback) {
      return data.callback()
    }
    else {
      return false
    }
  }

  App.execute_command = (ctx, data, cmd, arg) => {
    let command = App.commands[cmd]

    if (!command) {
      for (let key in App.commands) {
        if (App.commands[key].aliases) {
          if (App.commands[key].aliases.includes(cmd)) {
            command = App.commands[key]
            break
          }
        }
      }
    }

    if(command) {
      command.exec({ctx:ctx, data:data, arg:arg, cmd:cmd})
    }
    else if (App.db.commands[cmd] !== undefined) {
      App.run_command(ctx, cmd, arg, data)
    }
    else {
      let closest = App.find_closest(cmd, App.command_list)

      if (closest) {
        App.commands[closest].exec({ctx:ctx, data:data, arg:arg, cmd:closest})
      }
    }
  }
}
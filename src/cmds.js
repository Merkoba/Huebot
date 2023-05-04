module.exports = (Huebot) => {
  Huebot.commands = {
    image: {
      aliases: [`img`, `i`],
      description: `Change the image`,
      public: false,
      exec: (ox) => {
        Huebot.change_image(ox)
      }
    },
    tv: {
      aliases: [`yt`, `video`, `v`],
      description: `Change the tv`,
      public: false,
      exec: (ox) => {
        Huebot.change_tv(ox)
      }
    },
    commands: {
      description: `Manage commands`,
      public: false,
      exec: (ox) => {
        Huebot.manage_commands(ox)
      }
    },
    add: {
      description: `Shortcut to add a tv command`,
      public: false,
      exec: (ox) => {
        if (ox.arg.split(` `).length < 2) {
          Huebot.process_feedback(ox.ctx, ox.data, `Correct format --> .add [name] [url]`)
          return
        }
        ox.arg = `add tv ${ox.arg}`
        Huebot.manage_commands(ox)
      }
    },
    q: {
      description: `Manage the queue`,
      public: true,
      exec: (ox) => {
        Huebot.manage_queue(ox)
      }
    },
    next: {
      description: `Shortcut for queue (next tv item)`,
      public: true,
      exec: (ox) => {
        ox.arg = `next`
        Huebot.manage_queue(ox)
      }
    },
    adminadd: {
      description: `Add a bot admin`,
      public: false,
      exec: (ox) => {
        Huebot.add_admin(ox)
      }
    },
    adminremove: {
      description: `Remove a bot admin`,
      public: false,
      exec: (ox) => {
        Huebot.remove_admin(ox)
      }
    },
    admins: {
      description: `List admins`,
      public: false,
      exec: (ox) => {
        Huebot.manage_admins(ox)
      }
    },
    themes: {
      description: `Manage themes`,
      public: false,
      exec: (ox) => {
        Huebot.manage_themes(ox)
      }
    },
    stream: {
      description: `Put a random video stream`,
      public: false,
      exec: (ox) => {
        Huebot.get_random_stream(ox)
      }
    },
    activity: {
      description: `Show recent bot users`,
      public: false,
      exec: (ox) => {
        Huebot.show_activity(ox)
      }
    },
    clearadmins: {
      description: `Remove all bot admins`,
      public: false,
      exec: (ox) => {
        Huebot.clear_admins(ox)
      }
    },
    help: {
      description: `Show a summary of commands`,
      public: true,
      exec: (ox) => {
        Huebot.show_help(ox)
      }
    },
    ping: {
      description: `Returns a Pong`,
      public: false,
      exec: (ox) => {
        Huebot.ping(ox)
      }
    },
    whatis: {
      description: `Inspects a command`,
      public: true,
      exec: (ox) => {
        Huebot.whatis_command(ox)
      }
    },
    say: {
      description: `Make the bot say something`,
      public: false,
      exec: (ox) => {
        Huebot.say(ox)
      }
    },
    say2: {
      description: `Make the bot say something through a whisper`,
      public: false,
      exec: (ox) => {
        Huebot.say(ox, true)
      }
    },
    random: {
      description: `Random video. Optional keyword for semi-random search`,
      public: true,
      exec: (ox) => {
        Huebot.random(ox)
      }
    },
    leave: {
      description: `Leave the room`,
      public: false,
      exec: (ox) => {
        Huebot.leave_room(ox)
      }
    },
    join: {
      description: `Join a room`,
      public: false,
      exec: (ox) => {
        Huebot.join_room(ox)
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
        Huebot.suggest(ox)
      }
    },
    think: {
      description: `Get a random showerthought`,
      public: false,
      exec: (ox) => {
        Huebot.think(ox)
      }
    },
    public: {
      description: `Enable or disable public commands`,
      public: false,
      exec: (ox) => {
        Huebot.change_public(ox)
      }
    },
    remind: {
      description: `Remind a message to a user when they become active`,
      public: false,
      exec: (ox) => {
        Huebot.remind(ox)
      }
    },
    calc: {
      description: `Make a math calculation`,
      public: true,
      exec: (ox) => {
        Huebot.do_calculation(ox)
      }
    },
    roll: {
      description: `Simulate a dice`,
      public: true,
      exec: (ox) => {
        Huebot.roll_dice(ox)
      }
    },
    users: {
      description: `List connected users`,
      public: true,
      exec: (ox) => {
        Huebot.show_users(ox)
      }
    },
    decide: {
      description: `Decide on multiple options`,
      public: true,
      exec: (ox) => {
        Huebot.decide(ox)
      }
    },
    wiki: {
      description: `Define something using wikipedia`,
      public: true,
      exec: (ox) => {
        Huebot.search_wiki(ox)
      }
    },
    wolfram: {
      description: `Ask Wolfram something`,
      public: true,
      exec: (ox) => {
        Huebot.ask_wolfram(ox)
      }
    },
    shitpost: {
      description: `Random board post`,
      public: false,
      exec: (ox) => {
        Huebot.get_random_4chan_post(ox)
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
      exec: (ox) => {Huebot.inv_tv(ox)}
    },
    ai: {
      description: `Ask something to openai`,
      public: false,
      exec: (ox) => {Huebot.ask_openai(ox)}
    },
  }

  Huebot.command_list = []
  Huebot.public_command_list = []

  for (let key in Huebot.commands) {
    Huebot.command_list.push(key)

    if (Huebot.commands[key].public) {
      Huebot.public_command_list.push(key)
    }
  }

  Huebot.command_list.sort()

  // Must Include:
  // data.message
  // data.username
  // data.method
  // Optional:
  // data.callback
  Huebot.process_command = (ctx, data) => {
    let allowed = false
    let split = data.message.split(' ')
    let cmd = split[0]
    let arg

    if (split.length > 1) {
      cmd += ' '
      arg = Huebot.single_space(split.slice(1).join(` `))
    }
    else {
      arg = ``
    }

    cmd = cmd.substring(1).trim()

    if (!Huebot.is_admin(data.username)) {
      if (Huebot.db.options.public_commands) {
        if (Huebot.public_command_list.includes(cmd)) {
          allowed = true
        }
        else {
          let cmd2 = Huebot.db.commands[cmd]

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

    if (ctx.user_command_activity.length > Huebot.config.max_user_command_activity) {
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

            if (!c.startsWith(Huebot.prefix)) {
              cc = Huebot.prefix + c
              c2 = c
            }
            else {
              cc = c
              c2 = c.substring(1)
            }

            let acmd = Huebot.db.commands[c2]

            if (acmd !== undefined) {
              let spc = acmd.url.split(` `)[0]

              if (Huebot.command_list.includes(spc)) {
                cc = Huebot.prefix + acmd.url
              }
            }

            cmds.push(cc)
          }

          let qcmax = 0
          let cqid

          while (true) {
            cqid = Huebot.get_random_string(5) + Date.now()

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

          Huebot.run_commands_queue(ctx, cqid)

          if (data.callback) {
            return data.callback()
          }
          else {
            return false
          }
        }
      }
    }

    Huebot.execute_command(ctx, data, cmd, arg)

    if (data.callback) {
      return data.callback()
    }
    else {
      return false
    }
  }

  Huebot.execute_command = (ctx, data, cmd, arg) => {
    let command = Huebot.commands[cmd]

    if (!command) {
      for (let key in Huebot.commands) {
        if (Huebot.commands[key].aliases) {
          if (Huebot.commands[key].aliases.includes(cmd)) {
            command = Huebot.commands[key]
            break
          }
        }
      }
    }

    if(command) {
      command.exec({ctx:ctx, data:data, arg:arg, cmd:cmd})
    }
    else if (Huebot.db.commands[cmd] !== undefined) {
      Huebot.run_command(ctx, cmd, arg, data)
    }
    else {
      let closest = Huebot.find_closest(cmd, Huebot.command_list)

      if (closest) {
        Huebot.commands[closest].exec({ctx:ctx, data:data, arg:arg, cmd:closest})
      }
    }
  }
}
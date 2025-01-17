module.exports = (App) => {
  App.start_connection = (room_id) => {
    let ctx = {}

    ctx.room_id = room_id
    ctx.username = ``
    ctx.role = false
    ctx.room_image_mode = `disabled`
    ctx.room_tv_mode = `disabled`
    ctx.theme
    ctx.text_color
    ctx.emit_queue_timeout
    ctx.emit_queue = []
    ctx.recent_youtube_streams = []
    ctx.userlist = []
    ctx.background
    ctx.current_image_source
    ctx.current_tv_source
    ctx.commands_queue = {}
    ctx.user_command_activity = []
    ctx.emit_charge = 0
    ctx.q_image_cooldown = 0
    ctx.q_tv_cooldown = 0

    ctx.socket = App.i.io(App.db.config.server_address, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 1000,
    })

    ctx.socket.binaryType = `arraybuffer`

    ctx.socket.on(`connect`, () => {
      App.socket_emit(ctx, `join_room`, {
        alternative: true,
        room_id,
        username: App.db.config.bot_username,
        password: App.db.config.bot_password,
        no_message_board_posts: true,
      })
    })

    ctx.socket.on(`update`, (received) => {
      try {
        let type = received.type
        let data = received.data

        if (type === `joined`) {
          if (data.room_locked) {
            App.log(`Seems I'm banned from this room`)
            return false
          }

          App.log(`Joined ${room_id}`)
          App.connected_rooms[room_id] = {context:ctx}
          App.set_username(ctx, data.username)
          App.set_role(ctx, data.role)
          App.set_room_enables(ctx, data)
          App.set_theme(ctx, data)
          App.set_background(ctx, data)
          App.set_userlist(ctx, data)
          App.set_media_sources(ctx, data)
        }
        else if (type === `chat_message`) {
          if (data.username === ctx.username) {
            return false
          }

          if (data.edited) {
            return false
          }

          // OH HAI WOODY
          if (ctx.greet_pattern.test(data.message)) {
            App.send_message(ctx, `hello ${data.username}!`)
          }

          if (App.is_command(data.message)) {
            let obj = {
              username: data.username,
              message: data.message,
              method: `public`,
            }

            App.process_command(ctx, obj)
          }

          App.check_reminders(ctx, data.username)
          App.check_speech(ctx, data, ``)
        }
        else if (type === `user_joined`) {
          App.add_to_userlist(ctx, data.username)
          App.check_reminders(ctx, data.username)
        }
        else if (type === `user_disconnected`) {
          App.remove_from_userlist(ctx, data.username)
        }
        else if (type === `new_username`) {
          if (ctx.username === data.old_username) {
            App.set_username(ctx, data.username)
          }

          App.replace_in_userlist(ctx, data.old_username, data.username)
        }
        else if (type === `background_color_changed`) {
          ctx.background_color = data.color
        }
        else if (type === `text_color_changed`) {
          ctx.text_color = data.color
        }
        else if (type === `user_role_changed`) {
          if (ctx.username === data.username2) {
            App.set_role(ctx, data.role)
          }
        }
        else if (type === `whisper`) {
          if (data.username === ctx.username) {
            return false
          }

          if (App.is_command(data.message)) {
            let obj = {
              username: data.username,
              message: data.message,
              method: `whisper`,
            }

            App.process_command(ctx, obj)
          }
          else {
            if (!App.is_admin(data.username)) {
              return false
            }

            App.send_whisper(ctx, data.username, `Hi!`)
          }
        }
        else if (type === `background_changed`) {
          App.set_background(ctx, data)
        }
        else if (type === `image_source_changed`) {
          App.set_image_source(ctx, data.source)
        }
        else if (type === `tv_source_changed`) {
          App.set_tv_source(ctx, data.source)
        }
        else if (type === `request_slice_upload`) {
          App.next_upload_slice(ctx, data)
        }
      }
      catch (err) {
        App.log(err, `error`)
      }
    })

    ctx.socket.on(`disconnect`, () => {
      delete App.connected_rooms[room_id]
    })
  }

  App.socket_emit = (ctx, destination, data) => {
    let obj = {
      destination,
      data,
    }

    ctx.emit_queue.push(obj)

    if (ctx.emit_queue_timeout === undefined) {
      App.check_emit_queue(ctx)
    }
  }

  App.check_emit_queue = (ctx) => {
    if (ctx.emit_queue.length > 0) {
      let obj = ctx.emit_queue[0]

      if (obj !== `first`) {
        App.do_socket_emit(ctx, obj)
      }

      ctx.emit_queue.shift()

      ctx.emit_queue_timeout = setTimeout(() => {
        App.check_emit_queue(ctx)
      }, App.config.socket_emit_throttle)
    }
    else {
      clearTimeout(ctx.emit_queue_timeout)
      ctx.emit_queue_timeout = undefined
    }
  }

  App.do_socket_emit = (ctx, obj) => {
    if (ctx.emit_charge >= App.config.emit_limit) {
      return false
    }

    obj.data.server_method_name = obj.destination
    ctx.socket.emit(`server_method`, obj.data)
    ctx.emit_charge += 1
  }

  App.start_emit_charge_loop = () => {
    setInterval(() => {
      for (let key in App.connected_rooms) {
        let ctx = App.connected_rooms[key].context
        if (ctx.emit_charge > 0) {
          ctx.emit_charge -= 1
        }
      }
    }, 1000)
  }
}
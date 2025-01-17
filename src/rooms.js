module.exports = (App) => {
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

  App.add_room = (ox) => {
    if (!App.is_protected_admin(ox.data.username)) {
      return false
    }

    if (!ox.arg) {
      App.process_feedback(ox.ctx, ox.data, `Argument must be a room ID.`)
      return false
    }

    if (App.db.config.room_ids.includes(ox.arg)) {
      App.process_feedback(ox.ctx, ox.data, `Room already exists in the list.`)
      return false
    }

    App.db.config.room_ids.push(ox.arg)

    App.save_config(() => {
      App.process_feedback(ox.ctx, ox.data, `Room added.`)
    })
  }

  App.remove_room = (ox) => {
    if (!App.is_protected_admin(ox.data.username)) {
      return false
    }

    if (!ox.arg) {
      App.process_feedback(ox.ctx, ox.data, `Argument must be a room ID.`)
      return false
    }

    if (!App.db.config.room_ids.includes(ox.arg)) {
      App.process_feedback(ox.ctx, ox.data, `Room not in list.`)
      return false
    }

    App.db.config.room_ids = App.db.config.room_ids.filter(x => x !== ox.arg)

    App.save_config(() => {
      App.process_feedback(ox.ctx, ox.data, `Room removed.`)
    })
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

  App.set_userlist = (ctx, data) => {
    ctx.userlist = []

    for (let user of data.userlist) {
      ctx.userlist.push(user.username)
    }
  }

  App.add_to_userlist = (ctx, uname) => {
    for (let u of ctx.userlist) {
      if (u === uname) {
        return false
      }
    }

    ctx.userlist.push(uname)
  }

  App.remove_from_userlist = (ctx, uname) => {
    for (let i = 0; i < ctx.userlist.length; i++) {
      let u = ctx.userlist[i]

      if (u === uname) {
        ctx.userlist.splice(i, 1)
        return
      }
    }
  }

  App.replace_in_userlist = (ctx, old_uname, new_uname) => {
    for (let i = 0; i < ctx.userlist.length; i++) {
      let u = ctx.userlist[i]

      if (u === old_uname) {
        ctx.userlist[i] = new_uname
        return
      }
    }
  }

  App.set_room_enables = (ctx, data) => {
    ctx.room_image_mode = data.room_image_mode
    ctx.room_tv_mode = data.room_tv_mode
  }

  App.set_background = (ctx, data) => {
    ctx.background = data.background
    ctx.background_type = data.background_type
  }

  App.set_background_mode = (ctx, mode) => {
    ctx.background_mode = mode
  }

  App.set_background_effect = (ctx, effect) => {
    ctx.background_effect = effect
  }

  App.set_background_tile_dimensions = (ctx, dimensions) => {
    ctx.background_tile_dimensions = dimensions
  }
}
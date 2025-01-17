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
}
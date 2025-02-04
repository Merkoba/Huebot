module.exports = (App) => {
  App.send_message = (ctx, message, feedback = true) => {
    if (!message) {
      return false
    }

    message = App.do_replacements(ctx, message)
    message = message.substring(0, App.config.max_text_length)
    message = App.remove_pre_empty_lines(message)
    message = App.remove_multiple_empty_lines(message)
    message = message.trimEnd()

    App.socket_emit(ctx, `sendchat`, {
      message,
    })
  }

  App.send_message_all_rooms = (text) => {
    for (let key in App.connected_rooms) {
      App.send_message(App.connected_rooms[key].context, text)
    }
  }

  App.delete_message = (ctx, id) => {
    App.socket_emit(ctx, `delete_message`, {
      id,
    })
  }

  App.send_whisper = (ctx, uname, message) => {
    message = App.do_replacements(ctx, message)
    message = App.single_linebreak(App.clean_multiline(message.substring(0, App.config.max_text_length)))

    App.socket_emit(ctx, `whisper`, {
      type: `user`,
      usernames: [uname],
      message,
    })
  }

  App.like_message = (ox) => {
    let id = ox.data.message_id
    let type = `like`
    App.do_like_message(ox.ctx, id, type)
  }

  App.unlike_message = (ox) => {
    let id = ox.data.message_id
    let type = `unlike`
    App.do_like_message(ox.ctx, id, type)
  }

  App.do_like_message = (ctx, id, type) => {
    App.socket_emit(ctx, `like_message`, {id, type})
  }
}
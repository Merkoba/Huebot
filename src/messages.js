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

  App.change_media = (ctx, args = {}) => {
    let def_args = {
      type: ``,
      src: ``,
      feedback: true,
      comment: ``,
    }

    App.def_args(args, def_args)

    if (!App.config.media_types.includes(args.type)) {
      return false
    }

    if (!args.src) {
      return false
    }

    args.src = App.do_replacements(ctx, args.src)
    args.src = App.single_space(args.src)
    args.comment = args.comment.substring(0, App.config.max_media_comment_length).trim()

    if (args.src.length > App.config.max_media_source_length) {
      return false
    }

    if (args.type === `image`) {
      if (ctx.current_image_source === args.src) {
        return false
      }

      App.socket_emit(ctx, `change_image_source`, {
        src: args.src,
        comment: args.comment,
      })
    }
    else if (args.type === `tv`) {
      if (ctx.current_tv_source === args.src) {
        return false
      }

      App.socket_emit(ctx, `change_tv_source`, {
        src: args.src,
        comment: args.comment,
      })
    }
  }
}
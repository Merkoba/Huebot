module.exports = (App) => {
  App.set_media_sources = (ctx, data) => {
    let tv_done = false
    let image_done = false

    for (let m of data.log_messages.slice(0).reverse()) {
      if (!tv_done && (m.type === `tv`)) {
        App.set_tv_source(ctx, m.data.source)
        tv_done = true
      }

      if (!image_done && (m.type === `image`)) {
        App.set_image_source(ctx, m.data.source)
        image_done = true
      }

      if (tv_done && image_done) {
        break
      }
    }
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
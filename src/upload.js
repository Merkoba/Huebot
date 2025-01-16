module.exports = (App) => {
  App.upload_background = (ctx, path) => {
    let now = Date.now()
    let file = App.i.fs.readFileSync(path)

    let obj = {}
    obj.file = file
    obj.percentage = 0
    obj.next = App.get_file_next(file.size)

    obj.args = {}
    obj.args.action = `background_upload`
    obj.args.date = now
    obj.args.name = App.i.path.basename(path)
    obj.args.size = file.length
    obj.args.type = ``
    obj.args.comment = ``

    App.file_uploads[now] = obj

    let emit_data = {...obj.args}
    emit_data.data = file.slice(0, App.config.upload_slice_size)
    App.socket_emit(ctx, `slice_upload`, emit_data)
  }

  // This is called whenever the server asks for the next slice of a file upload
  App.next_upload_slice = (ctx, data) => {
    let obj = App.file_uploads[data.date]

    if (!obj) {
      return
    }

    let slice_size = App.config.upload_slice_size
    let place = data.current_slice * slice_size
    let slice = obj.file.slice(place, place + Math.min(slice_size, obj.args.size - place))
    obj.next = App.get_file_next(obj.args.size)
    obj.percentage = Math.floor(((slice_size * data.current_slice) / obj.args.size) * 100)
    let emit_data = {...obj.args}
    emit_data.data = slice
    App.socket_emit(ctx, `slice_upload`, emit_data)
  }

  // Gets the percentage based on the next file slice to be uploaded
  // Last slice would be 100
  App.get_file_next = (size) => {
    let next = Math.floor(
      ((App.config.upload_slice_size * 1) / size) * 100,
    )

    if (next > 100) {
      next = 100
    }

    return next
  }
}
module.exports = (App) => {
  App.upload_background = (ctx, path) => {
    let file = App.i.fs.readFileSync(path)

    let data = {}
    data.action = `background_upload`
    data.date = Date.now()
    data.name = App.i.path.basename(path)
    data.size = file.length
    data.type = ``
    data.comment = ``

    let obj = Object.assign({}, data)
    obj.file = file
    obj.next = App.get_file_next(data.size)
    obj.percentage = 0
    App.file_uploads[data.date] = obj

    let emit_data = Object.assign({}, data)
    emit_data.data = file.slice(0, App.config.upload_slice_size)
    App.socket_emit(ctx, `slice_upload`, emit_data)
  }

  // This is called whenever the server asks for the next slice of a file upload
  App.next_upload_slice = (data) => {
    let obj = App.obj_uploads[data.date]

    if (!obj) {
      return
    }

    let place = data.current_slice * App.config.upload_slice_size

    let slice = obj.file.slice(
      place,
      place + Math.min(App.config.upload_slice_size, file.hue_data.size - place),
    )

    obj.next = App.get_file_next(obj.size)

    if (obj.next >= 100) {
      file.hue_data.sending_last_slice = true
    }

    obj.percentage = Math.floor(
      ((App.config.upload_slice_size * data.current_slice) / obj.size) *
        100,
    )

    let emit_data = Object.assign({}, data)
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
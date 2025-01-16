module.exports = (App) => {
  App.upload_background = (ctx, path) => {
    let now = Date.now()
    let file = App.i.fs.readFileSync(path)

    let obj = {}
    obj.file = file

    obj.args = {}
    obj.args.action = `background_upload`
    obj.args.date = now
    obj.args.name = App.i.path.basename(path)
    obj.args.size = obj.file.size
    obj.args.type = ``
    obj.args.comment = ``

    App.file_uploads[now] = obj
    let slice = App.get_upload_slice(obj, 0, App.config.upload_slice_size)
    App.slice_upload_emit(ctx, obj, slice)
  }

  App.slice_upload_emit = (ctx, obj, slice) => {
    let args = {...obj.args}
    args.data = slice
    App.socket_emit(ctx, `slice_upload`, args)
  }

  // This is called whenever the server asks for the next slice of a file upload
  App.next_upload_slice = (ctx, data) => {
    let obj = App.file_uploads[data.date]

    if (!obj) {
      return
    }

    let slice_size = App.config.upload_slice_size
    let place = data.current_slice * slice_size
    let slice_end = place + Math.min(slice_size, obj.args.size - place)
    let slice = App.get_upload_slice(obj, place, slice_end)
    App.slice_upload_emit(ctx, obj, slice)
  }

  App.get_upload_slice = (obj, start, end) => {
    return obj.file.slice(start, end)
  }
}
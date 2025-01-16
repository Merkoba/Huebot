module.exports = (App) => {
  App.setup_files = (args) => {
    let template_files_location = `../files/_template_`
    let template_files_path = App.i.path.normalize(App.i.path.resolve(__dirname, template_files_location) + `/`)
    let files_name

    if ((args.length >= 2) && (args[1] !== `default`)) {
      files_name = args[1]
    }
    else {
      files_name = `default`
    }

    App.log(`Files path: ${files_name}`)
    const files_location = `../files/${files_name}`
    App.files_path = App.i.path.normalize(App.i.path.resolve(__dirname, files_location) + `/`)

    // Check if files dir exists
    if (!App.i.fs.existsSync(App.files_path)) {
      App.i.fs.mkdirSync(App.files_path)
      App.log(`Created Dir: ${App.files_path}`)
    }

    // Check if a file needs to be copied from the template dir
    for (let file of App.i.fs.readdirSync(template_files_path)) {
      let p = App.i.path.normalize(App.i.path.resolve(App.files_path, file))

      if (!App.i.fs.existsSync(p)) {
        let p0 = App.i.path.normalize(App.i.path.resolve(template_files_path, file))
        App.i.fs.copyFileSync(p0, p)
        App.log(`Copied: ${file}`)
      }
    }
  }

  App.save_file = (name, content, callback = false) => {
    let text = JSON.stringify(content)

    App.i.fs.writeFile(App.i.path.join(App.files_path, name), text, `utf8`, (err) => {
      if (err) {
        App.log(err, `error`)
      }
      else if (callback) {
        return callback()
      }
    })
  }
}
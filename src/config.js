module.exports = (App) => {
  App.setup_config = () => {
    let config_changed = false

    for (let key in App.def_config) {
      if (App.db.config[key] === undefined) {
        App.db.config[key] = App.def_config[key]
        config_changed = true
      }
    }

    if (config_changed) {
      App.i.fs.writeFileSync(`${App.configs_path}${App.config_name}.json`, JSON.stringify(App.db.config, `utf-8`, 4))
    }
  }

  App.save_config = (callback = false) => {
    let text = JSON.stringify(App.db.config, null, 4)
    let path = App.i.path.join(App.configs_path, `${App.config_name}.json`)

    App.i.fs.writeFile(path, text, `utf8`, (err) => {
      if (err) {
        App.log(err, `error`)
      }
      else if (callback) {
        return callback()
      }
    })
  }

  App.set_config = (args = {}) => {
    let def_args = {
      min: 1,
      max: 100,
    }

    App.def_args(args, def_args)

    if (!App.is_protected_admin(args.ox.data.username)) {
      return false
    }

    let value = args.ox.arg.trim()

    if (args.type === `int`) {
      value = parseInt(args.ox.arg)

      if (isNaN(value)) {
        let message = `${args.name} must be a number.`
        App.process_feedback(args.ox.ctx, args.ox.data, message)
        return false
      }

      if ((value < args.min) || (value > args.max)) {
        let message = `${args.name} must be between ${args.min} and ${args.max}.`
        App.process_feedback(args.ox.ctx, args.ox.data, message)
        return false
      }
    }
    else if (args.type === `url`) {
      if (!App.is_url(value)) {
        value = `https://${value}`
      }
    }
    else if (args.type === `bool`) {
      if ((value === `true`) || (value === `yes`) || (value === `1`) || (value === `on`)) {
        value = true
      }
      else if ((value === `false`) || (value === `no`) || (value === `0`) || (value === `off`)) {
        value = false
      }
      else {
        let message = `${args.name} must be a boolean.`
        App.process_feedback(args.ox.ctx, args.ox.data, message)
        return false
      }
    }
    else if (args.type === `str`) {
      if (value === `""`) {
        value = ``
      }
    }

    if ((value === undefined) || (value === ``)) {
      let svalue = App.db.config[args.key]

      if (value === ``) {
        svalue = `[Empty]`
      }

      App.process_feedback(args.ox.ctx, args.ox.data, `${args.name}: ${svalue}`)
      return false
    }

    App.db.config[args.key] = value

    App.save_config(() => {
      App.process_feedback(args.ox.ctx, args.ox.data, `${args.name} set to "${value}".`)
    })

    return true
  }

  App.set_auto_theme = (ox) => {
    if (App.set_config({ox, name: `Auto Theme`, key: `auto_theme`, type: `bool`})) {
      App.start_auto_theme_interval()
    }
  }

  App.set_auto_theme_delay = (ox) => {
    if (App.set_config({ox, name: `Auto Theme Delay`, key: `auto_theme_delay`, type: `int`, min: 1, max: 43200})) {
      App.start_auto_theme_interval()
    }
  }

  App.set_fourget = (ox) => {
    App.set_config({ox, name: `4get Instance`, key: `fourget`, type: `url`})
  }

  App.set_scraper = (ox) => {
    App.set_config({ox, name: `4get Scraper`, key: `scraper`, type: `str`})
  }

  App.set_model = (ox) => {
    App.set_config({ox, name: `AI Model`, key: `model`, type: `str`})
  }

  App.set_rules = (ox) => {
    App.set_config({ox, name: `AI Rules`, key: `rules`, type: `str`})
  }

  App.set_words = (ox) => {
    App.set_config({ox, name: `AI Words`, key: `words`, type: `int`, min: 1, max: 2000})
  }

  App.set_history = (ox) => {
    if (App.set_config({ox, name: `AI History`, key: `history`, type: `int`, min: 0, max: 10})) {
      App.reset_ai_history()
    }
  }
}
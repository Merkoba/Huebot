module.exports = (App) => {
  App.setup_config = () => {
    let config_changed = false
    let defconfig = {...App.def_config}

    for (let key in defconfig) {
      if (App.db.config[key] === undefined) {
        App.db.config[key] = defconfig[key]
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
    if (!App.is_protected_admin(args.ox.data.username)) {
      return false
    }

    let def_args = {
      min: 1,
      max: 100,
    }

    App.def_args(def_args, args)

    function save(value) {
      App.db.config[args.key] = value

      App.save_config(() => {
        let svalue = App.config_svalue(args, value)
        App.process_feedback(args.ox.ctx, args.ox.data, `${args.name} set to ${svalue}.`)
      })
    }

    let value = args.value.trim()

    if ((value === undefined) || (value === ``)) {
      let value = App.db.config[args.key]
      let svalue = App.config_svalue(args, value)
      App.process_feedback(args.ox.ctx, args.ox.data, `${args.name}: ${svalue}`)
      return false
    }

    if (value === `reset`) {
      save(App.get_def_config(args.key))
      return true
    }

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

    save(value)
    return true
  }

  App.get_def_config = (key) => {
    let defconfig = {...App.def_config}
    return defconfig[key]
  }

  App.config_svalue = (args, value) => {
    let svalue = value

    if (args.type === `str`) {
      if (svalue === ``) {
        svalue = `[Empty]`
      }
      else {
        svalue = `"${svalue}"`
      }
    }

    return svalue
  }

  App.config_value = (ox, value) => {
    if (value === undefined) {
      return ox.arg
    }

    return JSON.stringify(value)
  }

  App.set_config_cmd = (args, action) => {
    args.value = App.config_value(args.ox, args.value)

    if (App.set_config(args)) {
      if (action) {
        action()
      }
    }
  }

  App.set_auto_theme = (ox, value) => {
    let obj = {ox, value, name: `Auto Theme`, key: `auto_theme`, type: `bool`}

    App.set_config_cmd(obj, () => {
      App.start_auto_theme_interval()
    })
  }

  App.set_auto_theme_delay = (ox, value) => {
    let obj = {ox, value, name: `Auto Theme Delay`, key: `auto_theme_delay`,
      type: `int`, min: 1, max: 43200}

    App.set_config_cmd(obj, () => {
      App.start_auto_theme_interval()
    })
  }

  App.set_fourget = (ox, value) => {
    let obj = {ox, value, name: `4get Instance`, key: `fourget`, type: `url`}
    App.set_config_cmd(obj)
  }

  App.set_scraper = (ox, value) => {
    let obj = {ox, value, name: `4get Scraper`, key: `scraper`, type: `str`}
    App.set_config_cmd(obj)
  }

  App.set_model = (ox, value) => {
    let obj = {ox, value, name: `AI Model`, key: `model`, type: `str`}
    App.set_config_cmd(obj)
  }

  App.set_rules = (ox, value) => {
    let obj = {ox, value, name: `AI Rules`, key: `rules`, type: `str`}
    App.set_config_cmd(obj)
  }

  App.set_words = (ox, value) => {
    let obj = {ox, value, name: `AI Words`, key: `words`, type: `int`,
      min: 1, max: 2000}

    App.set_config_cmd(obj)
  }

  App.set_context = (ox, value) => {
    let obj = {ox, value, name: `AI Context`, key: `context`, type: `int`,
      min: 0, max: 10}

    App.set_config_cmd(obj, () => {
      App.reset_ai_context()
    })
  }

  App.set_ai_enabled = (ox, value) => {
    let obj = {ox, value, name: `AI Enabled`, key: `ai_enabled`, type: `bool`}

    App.set_config_cmd(obj, () => {
      App.start_ai()
    })
  }

  App.set_check_rss = (ox, value) => {
    let obj = {ox, value, name: `RSS Enabled`, key: `rss_enabled`, type: `bool`}

    App.set_config_cmd(obj, () => {
      App.start_rss_interval()
    })
  }

  App.set_check_rss_delay = (ox, value) => {
    let obj = {ox, value, name: `RSS Delay`, key: `rss_delay`, type: `int`,
      min: 1, max: 1000}

    App.set_config_cmd(obj, () => {
      App.start_rss_interval()
    })
  }
}
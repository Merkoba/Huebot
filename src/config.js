module.exports = (App) => {
  App.set_config = (ox, name, key, vtype) => {
    if (!App.is_protected_admin(ox.data.username)) {
      return false
    }

    let value = ox.arg.trim()

    if (vtype === `int`) {
      value = parseInt(ox.arg)

      if (isNaN(value)) {
        return false
      }
    }
    else if (vtype === `url`) {
      if (!App.is_url(value)) {
        value = `https://${value}`
      }
    }
    else if (vtype === `bool`) {
      if (value === `true`) {
        value = true
      }
      else if (value === `false`) {
        value = false
      }
      else {
        return
      }
    }

    if ((value === undefined) || (value === ``)) {
      App.process_feedback(ox.ctx, ox.data, `${name}: ${App.db.config[key]}`)
      return false
    }

    App.db.config[key] = value

    App.save_config(() => {
      App.process_feedback(ox.ctx, ox.data, `${name} set to "${value}".`)
    })
  }

  App.set_auto_theme = (ox) => {
    App.set_config(ox, `Auto Theme`, `auto_theme`, `bool`)
  }

  App.set_auto_theme_delay = (ox) => {
    App.set_config(ox, `Auto Theme Delay`, `auto_theme_delay`, `int`)
  }

  App.set_fourget = (ox) => {
    App.set_config(ox, `4get Instance`, `fourget`, `url`)
  }

  App.set_scraper = (ox) => {
    App.set_config(ox, `4get Scraper`, `scraper`, `str`)
  }

  App.set_model = (ox) => {
    App.set_config(ox, `AI Model`, `model`, `str`)
  }

  App.set_rules = (ox) => {
    App.set_config(ox, `AI Rules`, `rules`, `str`)
  }

  App.set_words = (ox) => {
    App.set_config(ox, `AI Words`, `words`, `int`)
  }
}
class NotifyCard extends HTMLElement {
  setConfig(config) {
    if (!config.target && (!config.action || !config.data)) {
      throw new Error('You need to define an action and data');
    }
    this.config = config;

    // support for legacy config
    if (!config.action && config.target) {
      if (typeof this.config.target == "string") {
        this.targets = [this.config.target];
      } else if (Array.isArray(this.config.target)) {
        this.targets = this.config.target
      } else {
        throw new Error('Target needs to be a list or single target');
      }
    }
    this.render();
  }

  render() {
    if (!this.content) {
      this.card = document.createElement('ha-card');
      this.content = document.createElement('div');
      this.content.style.padding = '0 16px 16px';
      this.card.appendChild(this.content);
      this.appendChild(this.card);
    }
    this.card.header = this.config.card_title ?? "Send Notification";
    this.content.innerHTML = "";

    if (this.config.notification_title instanceof Object) {
      let title_label = this.config.notification_title.input ?? "Notification Title"
      this.content.innerHTML += `
      <div style="display: flex">
        <ha-textfield id="notification_title" style="flex-grow: 1" label="${title_label}"/>
      </div>
      `
    }

    let label = this.config.label ?? "Notification Text";
    this.content.innerHTML += `
    <div style="display: flex">   
      <ha-textfield id="notification_text" style="flex-grow: 1" label="${label}"></ha-textfield>
      <ha-icon-button id="send_button" slot="suffix">
          <ha-icon icon="mdi:send">
      </ha-icon-button>
    </div>
    `;
    this.content.querySelector("#send_button").addEventListener("click", this.send.bind(this), false);
    this.content.querySelector("#notification_text").addEventListener("keydown", this.keydown.bind(this), false)
  }

  send() {
    const recursive_render_template = (data, variables, replacement_terms) => {
      if (Array.isArray(data)) {
        return Promise.all(data.map(t => recursive_render_template(t, variables, replacement_terms)));
      }

      if (typeof data === 'object' && data !== null) {
        return Promise.all(
          Object.entries(data)
            .map(([k, v]) => recursive_render_template(v, variables, replacement_terms).then(nv => [k, nv]))
        ).then(res => Object.fromEntries(res));
      }

      if (typeof data === "string") {
        for (const [key, value] of Object.entries(replacement_terms)) {
          data = data.replaceAll(key, value);
        }
        if (data.includes("{{") || data.includes("{%")) {
          return this.hass.callApi("post", "template", { "template": data, "variables": variables });
        }
      }
      return Promise.resolve(data);
    }

    let msg = this.content.querySelector("#notification_text").value;
    let title = this.content.querySelector("#notification_title")?.value ?? this.config.notification_title;

    if (this.config.action) {
      let [domain, service] = this.config.action.split(".");
      recursive_render_template(this.config.data, {
        "msg": msg,
        "title": title,
        "user": this.hass.user,
      }, {
        // legacy support
        "$MSG": msg,
        "$TITLE": title,
        // save on template rendering request for common cases
        "{{ msg }}": msg,
        "{{ title }}": title,
        "{{ user.name }}": this.hass.user.name,
      }).then(data => {
        this.hass.callService(domain, service, data, this.config.target);
      })
    } else {
      // support for legacy config
      for (let t of this.targets) {
        let [domain, target = null] = t.split(".");
        if (target === null) {
          target = domain;
          domain = "notify";
        }

        if (domain === "tts") {
          this.hass.callService(domain, target, { "entity_id": this.config.service, "media_player_entity_id": this.config.entity, "message": msg });
        } else {
          this.hass.callService(domain, target, { message: msg, title: title, data: this.config.data });
        }
      }
    }

    this.content.querySelectorAll("ha-textfield").forEach(e => e.value = "");
  }

  keydown(e) {
    if (e.code == "Enter") this.send();
  }
}

customElements.define('notify-card', NotifyCard);

class NotifyCard extends HTMLElement {
  setConfig(config) {
    if (!config.target && (!config.action || !config.data)) {
      throw new Error('You need to define an action and data');
    }

    this.config = config;

    // support for legacy config
    if (!config.action && config.target) {
      if (typeof this.config.target === "string") {
        this.targets = [this.config.target];
      } else if (Array.isArray(this.config.target)) {
        this.targets = this.config.target;
      } else {
        throw new Error('Target needs to be a list or single target');
      }
    }

    this.render();
  }

  set hass(hass) {
    // Store hass reference for callService and callApi use in send()
    this._hass = hass;
  }

  get hass() {
    return this._hass;
  }

  render() {
    if (!this.content) {
      this.card = document.createElement('ha-card');
      this.content = document.createElement('div');
      this.card.appendChild(this.content);
      this.appendChild(this.card);
    }

    // Guard against YAML passing false as the string "false"
    const hasTitle =
      this.config.card_title !== false &&
      this.config.card_title !== 'false';

    // Only set header when card_title is not explicitly false
    this.card.header = hasTitle
      ? (this.config.card_title ?? "Send Notification")
      : null;

    // Adjust top padding based on whether a header is present
    // as per ha-card's default styles to maintain consistent spacing
    this.content.style.padding = hasTitle
      ? '0 16px 16px'
      : '16px';

    // Remove border, shadow, and background when used inside another card (group mode)
    if (this.config.group) {
      this.card.style.border = 'none';
      this.card.style.boxShadow = 'none';
      this.card.style.background = 'transparent';
    }

    this.content.innerHTML = "";

    if (this.config.notification_title instanceof Object) {
      const title_label =
        this.config.notification_title.input ?? "Notification Title";

      this.content.innerHTML += `
        <div style="display: flex">
          <ha-input
            id="notification_title"
            style="flex-grow: 1"
            label="${title_label}">
          </ha-input>
        </div>
      `;
    }

    const label = this.config.label ?? "Notification Text";
    const icon = this.config.icon ?? "mdi:send";

    // Nudge internal styling as ha-input adds padding-bottom: 8px.
    // That misaligns the send button when the title is present and breaks
    // ha-card 16px all-round padding when the title is absent.
    // If ha-input is ever fixed (as it should be...) then these two nudges
    // can be removed and the default ha-input styling will work as expected.
    const inputStyle = hasTitle
      ? 'flex-grow: 1;'
      : 'flex-grow: 1; padding-bottom: 0px;';

    const buttonStyle = hasTitle
      ? 'padding-bottom: 8px;'
      : '';

    this.content.innerHTML += `
      <div style="display: flex; align-items: center; gap: 8px;">
        <ha-input
          id="notification_text"
          style="${inputStyle}"
          label="${label}">
        </ha-input>

        <ha-icon-button
          id="send_button"
          style="${buttonStyle}">
          <ha-icon icon="${icon}"></ha-icon>
        </ha-icon-button>
      </div>
    `;

    // Replace nodes to drop any previously attached event listeners before re-binding
    const sendBtn = this.content.querySelector("#send_button");
    const freshSendBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(freshSendBtn, sendBtn);

    const textField = this.content.querySelector("#notification_text");
    const freshTextField = textField.cloneNode(true);
    textField.parentNode.replaceChild(freshTextField, textField);

    freshSendBtn.addEventListener(
      "click",
      this.send.bind(this),
      false
    );

    freshTextField.addEventListener(
      "keydown",
      this.keydown.bind(this),
      false
    );
  }

  send() {
    const recursive_render_template = (
      data,
      variables,
      replacement_terms
    ) => {

      if (Array.isArray(data)) {
        return Promise.all(
          data.map(t =>
            recursive_render_template(
              t,
              variables,
              replacement_terms
            )
          )
        );
      }

      if (typeof data === 'object' && data !== null) {
        return Promise.all(
          Object.entries(data)
            .map(([k, v]) =>
              recursive_render_template(
                v,
                variables,
                replacement_terms
              ).then(nv => [k, nv])
            )
        ).then(res => Object.fromEntries(res));
      }

      if (typeof data === "string") {
        for (const [key, value] of Object.entries(replacement_terms)) {
          data = data.replaceAll(key, value);
        }

        if (data.includes("{{") || data.includes("{%")) {
          return this.hass.callApi(
            "post",
            "template",
            {
              template: data,
              variables: variables,
            }
          );
        }
      }

      return Promise.resolve(data);
    };

    const msg =
      this.content.querySelector("#notification_text").value;

    const title =
      this.content.querySelector("#notification_title")?.value ??
      this.config.notification_title;

    if (this.config.action) {
      const [domain, service] =
        this.config.action.split(".");

      recursive_render_template(
        this.config.data,
        {
          msg: msg,
          title: title,
          user: this.hass.user,
        },
        {
          // legacy support
          "$MSG": msg,
          "$TITLE": title,

          // save on template rendering request for common cases
          "{{ msg }}": msg,
          "{{ title }}": title,
          "{{ user.name }}": this.hass.user.name,
        }
      ).then(data => {
        this.hass.callService(
          domain,
          service,
          data,
          this.config.target
        );
      });

    } else {
      // support for legacy config
      for (const t of this.targets) {

        let [domain, target = null] = t.split(".");

        if (target === null) {
          target = domain;
          domain = "notify";
        }

        if (domain === "tts") {
          this.hass.callService(
            domain,
            target,
            {
              entity_id: this.config.service,
              media_player_entity_id: this.config.entity,
              message: msg,
            }
          );

        } else {
          this.hass.callService(
            domain,
            target,
            {
              message: msg,
              title: title,
              data: this.config.data,
            }
          );
        }
      }
    }

    this.content
      .querySelectorAll("ha-input")
      .forEach(e => e.value = "");
  }

  keydown(e) {
    if (e.code === "Enter") {
      this.send();
    }
  }

  getCardSize() {
    // One row for the text input,
    // plus one if a notification title input is present
    return this.config.notification_title instanceof Object
      ? 2
      : 1;
  }
}

customElements.define('notify-card', NotifyCard);

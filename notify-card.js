class NotifyCard extends HTMLElement {
  setConfig(config) {
    if (config.send_action) {
      if (!(config.send_action.perform_action ?? config.send_action.service)) {
        throw new Error('You need to choose an action to perform');
      }
    } else if (!config.target && (!config.action || !config.data)) {
      throw new Error('You need to define a send_action, or an action and data');
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
    // Store hass reference for service calls and template rendering in send()
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

    // card_title: false is the older way of hiding the title.
    // Guard against YAML passing false as the string "false"
    const hasTitle =
      this.config.show_title !== false &&
      this.config.card_title !== false &&
      this.config.card_title !== 'false';

    // Only set header when the title is shown
    this.card.header = hasTitle
      ? (this.config.card_title || "Send Notification")
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
            style="flex-grow: 1; min-width: 0"
            label="${title_label}">
          </ha-input>
        </div>
      `;
    }

    const label = this.config.label || "Notification Text";
    const icon = this.config.icon || "mdi:send";

    // Nudge internal styling as ha-input adds padding-bottom: 8px.
    // That misaligns the send button when the title is present and breaks
    // ha-card 16px all-round padding when the title is absent.
    // If ha-input is ever fixed (as it should be...) then these two nudges
    // can be removed and the default ha-input styling will work as expected.
    // min-width: 0 lets the text field shrink to fit narrow cards, such as
    // a half-width card in a sections dashboard, instead of pushing the send
    // button outside the card.
    const inputStyle = hasTitle
      ? 'flex-grow: 1; min-width: 0;'
      : 'flex-grow: 1; min-width: 0; padding-bottom: 0px;';

    const buttonStyle = hasTitle
      ? 'flex-shrink: 0; padding-bottom: 8px;'
      : 'flex-shrink: 0;';

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

  renderTemplate(template, variables) {
    return new Promise((resolve, reject) => {
      // A result can arrive before subscribeMessage provides its unsubscribe
      // function. Remember pending cleanup so this one-shot subscription
      // cannot remain active after it has settled.
      let unsubscribe;
      let unsubscribePending = false;
      let settled = false;

      const cleanup = () => {
        if (unsubscribe) {
          const unsubscribeNow = unsubscribe;
          unsubscribe = undefined;
          unsubscribeNow();
        } else {
          unsubscribePending = true;
        }
      };

      const resolveOnce = value => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      };

      const rejectOnce = error => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      this.hass.connection.subscribeMessage(
        event => {
          if (event.error) {
            if (event.level === "WARNING") {
              console.warn(`Notify Card template warning: ${event.error}`);
              return;
            }

            rejectOnce(new Error(event.error));
            return;
          }

          resolveOnce(event.result);
        },
        {
          type: "render_template",
          template: template,
          variables: variables,
          report_errors: true,
        }
      ).then(unsubscribeFunction => {
        unsubscribe = unsubscribeFunction;
        if (unsubscribePending) cleanup();
      }).catch(rejectOnce);
    });
  }

  showError(error) {
    const message = error instanceof Error
      ? error.message
      : String(error);

    console.error("Notify Card:", error);
    this.dispatchEvent(
      new CustomEvent("hass-notification", {
        bubbles: true,
        composed: true,
        detail: {
          message: `Notify Card: ${message}`,
        },
      })
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
          // The REST template endpoint requires an administrator. The
          // WebSocket renderer does not require administrator privileges.
          return this.renderTemplate(data, variables);
        }
      }

      return Promise.resolve(data);
    };

    const msg =
      this.content.querySelector("#notification_text").value;

    const title =
      this.content.querySelector("#notification_title")?.value ??
      this.config.notification_title;

    // send_action is the visual editor's format (a dashboard perform-action,
    // which may still use the older service/service_data keys). The flat
    // action/data/target options remain supported.
    const sendAction = this.config.send_action;
    const action = sendAction
      ? {
          action: sendAction.perform_action ?? sendAction.service,
          data: sendAction.data ?? sendAction.service_data ?? {},
          target: sendAction.target,
        }
      : this.config.action && {
          action: this.config.action,
          data: this.config.data,
          target: this.config.target,
        };

    // The action editor clears its fields when another action is chosen,
    // so an empty message on an action that takes one uses the typed text
    if (sendAction && action.action && action.data.message === undefined) {
      const [domain, service] = action.action.split(".");
      if (this.hass.services?.[domain]?.[service]?.fields?.message) {
        action.data = { ...action.data, message: "{{ msg }}" };
      }
    }

    if (action) {
      const [domain, service] =
        action.action.split(".");

      recursive_render_template(
        action.data,
        {
          msg: msg,
          title: title,
          user: this.hass.user,
        },
        {
          // legacy support
          "$MSG": msg,
          "$TITLE": title ?? "",

          // save on template rendering request for common cases
          "{{ msg }}": msg,
          "{{ title }}": title ?? "",
          "{{ user.name }}": this.hass.user.name,
        }
      ).then(data =>
        this.hass.callService(
          domain,
          service,
          data,
          action.target
        )
      ).catch(error => this.showError(error));

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

  static getStubConfig() {
    // Starting config for the card picker. Persistent notifications are
    // available on every installation, so the preview works out of the box.
    return {
      send_action: {
        action: "perform-action",
        perform_action: "persistent_notification.create",
        data: {
          message: "{{ msg }}",
        },
      },
    };
  }

  static getConfigForm() {
    // Visual editor. Options not in the schema (notification_title) are
    // kept as they are and stay editable in YAML.
    const labels = {
      show_title: "Show title",
      card_title: "Card title",
      label: "Text field label",
      icon: "Send button icon",
      group: "Blend into a parent card",
      send_action: "Send action",
      send_action_note: "Use {{ msg }} for user text entered on the card",
    };

    return {
      schema: [
        { name: "card_title", selector: { text: {} } },
        {
          type: "grid",
          name: "",
          schema: [
            { name: "label", selector: { text: {} } },
            { name: "icon", selector: { icon: {} } },
          ],
        },
        {
          type: "grid",
          name: "",
          schema: [
            { name: "show_title", default: true, selector: { boolean: {} } },
            { name: "group", selector: { boolean: {} } },
          ],
        },
        // Home Assistant's own action editor, which shows the fields and
        // targets of the chosen action
        // Shown as text above the action editor; a required field's helper
        // only appears as a tooltip
        { type: "constant", name: "send_action_note" },
        // required also removes the editor's "Default" choice, which would
        // leave the card without an action
        {
          name: "send_action",
          required: true,
          selector: { ui_action: { actions: ["perform-action"] } },
        },
      ],
      computeLabel: schema => labels[schema.name],
      assertConfig: config => {
        if (!config.send_action && (config.action || config.target)) {
          throw new Error("Cards using action, data and target can only be edited in YAML. Move them into send_action to use the visual editor");
        }
        if (config.card_title === false || config.card_title === 'false') {
          throw new Error("Replace card_title: false with show_title: false to use the visual editor");
        }
      },
    };
  }

  getCardSize() {
    // One row for the text input,
    // plus one if a notification title input is present
    return this.config.notification_title instanceof Object
      ? 2
      : 1;
  }

  getGridOptions() {
    // Sections dashboard: full width by default, height follows the content
    return {
      columns: 12,
      min_columns: 4,
    };
  }
}

customElements.define('notify-card', NotifyCard);

// Register with the dashboard card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "notify-card",
  name: "Notify Card",
  description: "Send notifications directly from the dashboard",
  preview: true,
  documentationURL: "https://github.com/bernikr/lovelace-notify-card",
});

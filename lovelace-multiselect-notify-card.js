class NotifyCard extends HTMLElement {
  setConfig(config) {
    if (!config.targets) {
      throw new Error('You need to define targets');
    }
    this.config = config;
    this.targets = this.config.targets;
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

    const targetsSelect = document.createElement('select');
    targetsSelect.multiple = true;
    targetsSelect.style.width = "100%";

    this.targets.forEach(targetObj => {
      const option = document.createElement('option');
      option.value = targetObj.entity;
      option.text = targetObj.label || targetObj.entity;
      targetsSelect.appendChild(option);
    });

    this.content.appendChild(targetsSelect);

    let labelText = this.config.label ?? "Notification Text";
    this.content.innerHTML += `
    <div style="display: flex; margin-top: 16px;">   
      <textarea id="notification_text" style="flex-grow: 1" placeholder="${labelText}"></textarea>
      <button id="send_button">Send</button>
    </div>
    `;
    this.content.querySelector("#send_button").addEventListener("click", this.send.bind(this), false);
    this.content.querySelector("#notification_text").addEventListener("keydown", this.keydown.bind(this), false);
  }

  send() {
    let msg = this.content.querySelector("#notification_text").value;
    let title = this.config.notification_title ?? "Home Assistant Notification";
    let selectedTargets = Array.from(this.content.querySelector('select').selectedOptions).map(opt => opt.value);
    
    selectedTargets.forEach(target => {
      this.hass.callService('notify', target, {
          message: msg,
          title: title
      });
    });

    this.content.querySelector("#notification_text").value = "";
  }

  keydown(e) {
    if (e.code == "Enter" && e.ctrlKey) {
      this.send();
    }
  }
}

customElements.define('lovelace-multiselect-notify-card', NotifyCard);

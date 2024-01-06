class NotifyCard extends HTMLElement {
  setConfig(config) {
    if (!config.targets) {
      throw new Error('You need to define a list of targets');
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

    // Removing the existing select element code
    // and replacing it with radio button creation
    this.targets.forEach(target => {
        const container = document.createElement('div');
        const radioInput = document.createElement('input');
        radioInput.type = 'radio';
        radioInput.id = target;
        radioInput.name = 'notification_target';
        radioInput.value = target;

        const label = document.createElement('label');
        label.htmlFor = target;
        label.textContent = target; // You can customize this label

        container.appendChild(radioInput);
        container.appendChild(label);
        this.content.appendChild(container);
    });

    let label = this.config.label ?? "Notification Text";
    this.content.innerHTML += `
    <div style="display: flex">   
      <textarea id="notification_text" style="flex-grow: 1" placeholder="${label}"></textarea>
      <button id="send_button">Send</button>
    </div>
    `;
    this.content.querySelector("#send_button").addEventListener("click", this.send.bind(this), false);
    this.content.querySelector("#notification_text").addEventListener("keydown", this.keydown.bind(this), false);
  }

  send() {
    let msg = this.content.querySelector("#notification_text").value;
    let title = this.config.notification_title ?? "Home Assistant Notification";
    let selectedTarget = this.content.querySelector('input[name="notification_target"]:checked').value;
    
    // Single target selected by radio button
    this.hass.callService('notify', selectedTarget, {
        message: msg,
        title: title
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

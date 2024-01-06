class NotifyCard extends HTMLElement {
  setConfig(config) {
    if (!config.targets) {
      throw new Error('You need to define targets with labels');
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

    this.targets.forEach(targetObj => {
        const target = targetObj.entity; // Access the entity ID
        const label = targetObj.label; // Access the label

        const container = document.createElement('div');
        const radioInput = document.createElement('input');
        radioInput.type = 'radio';
        radioInput.id = target;
        radioInput.name = 'notification_target';
        radioInput.value = target;

        const labelElement = document.createElement('label');
        labelElement.htmlFor = target;
        labelElement.textContent = label || target; // Use the label, fallback to entity ID

        container.appendChild(radioInput);
        container.appendChild(labelElement);
        this.content.appendChild(container);
    });

    let labelText = this.config.label ?? "Notification Text";
    this.content.innerHTML += `
    <div style="display: flex">   
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
    let selectedTarget = this.content.querySelector('input[name="notification_target"]:checked').value;
    
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

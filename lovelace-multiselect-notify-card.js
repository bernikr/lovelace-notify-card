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
    this.card.style.padding = '16px';
    this.card.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    this.content.style.display = 'flex';
    this.content.style.flexDirection = 'column';
    this.content.innerHTML = "";

    const targetsSelect = document.createElement('select');
    targetsSelect.multiple = true;
    targetsSelect.style.width = '100%';
    targetsSelect.style.marginBottom = '16px';
    targetsSelect.placeholder = 'Select targets...'; // Example placeholder

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
    const sendButton = this.content.querySelector("#send_button");
    sendButton.style.backgroundColor = '#0d6efd';
    sendButton.style.color = 'white';
    sendButton.style.border = 'none';
    sendButton.style.padding = '10px 20px';
    sendButton.style.borderRadius = '5px';
    sendButton.style.cursor = 'pointer';
    sendButton.onmouseover = () => sendButton.style.backgroundColor = '#0b5ed7';
    sendButton.onmouseout = () => sendButton.style.backgroundColor = '#0d6efd';

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

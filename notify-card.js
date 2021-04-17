class NotifyCard extends HTMLElement {
  setConfig(config) {
    if (!config.target) {
      throw new Error('You need to define one or more targets');
    }
    this.config = config;
    if (typeof this.config.target == "string") {
      this.targets = [this.config.target];
    } else if (Array.isArray(this.config.target)) {
      this.targets = this.config.target
    } else {
      throw new Error('Target needs to be a list or single target');
    }
    this.render();
  }

  render() {
    if (!this.content) {
      const card = document.createElement('ha-card');
      this.content = document.createElement('div');
      this.content.style.padding = '16px 16px';
      card.appendChild(this.content);
      this.appendChild(card);
    }
    let label = this.config.label || "Notification Text"
    this.content.innerHTML = `
      <div style="display: flex">
        <paper-input style="flex-grow: 1" label="${label}">
          <ha-icon-button icon="hass:send" slot="suffix"/>
        </paper-input>
      </div>
    `;
    this.content.querySelector("ha-icon-button").addEventListener("click", this.send.bind(this), false);
  }

  send(){
    let msg = this.content.querySelector("paper-input").value;
    for (let t of this.targets) {
      this.hass.callService("notify", t, {message: msg});
    }
    this.content.querySelector("paper-input").value = "";
  }
}

customElements.define('notify-card', NotifyCard);

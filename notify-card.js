class NotifyCard extends HTMLElement {
  setConfig(config) {
    if (!config.target && (!config.action || !config.data)) {
      throw new Error('You need to define an action and data');
    }
    this.config = config;
    if(config.target){
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

    if(this.config.notification_title instanceof Object){
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

  send(){
    const dict_replace = (dict, terms) => {
      if(Array.isArray(dict)) {
        return dict.map(t => dict_replace(t, terms));
      }
      
      if(typeof dict === 'object' && dict !== null) {
        return Object.fromEntries(
          Object.entries(dict)
            .map(([k, v]) => [k, dict_replace(v, terms)]
          )
        );
      }
      
      return dict in terms ? terms[dict] : dict;
    };


    let msg = this.content.querySelector("#notification_text").value;
    let title = this.content.querySelector("#notification_title")?.value ?? this.config.notification_title;

    if(this.config.action){
      let data = dict_replace(this.config.data, {"$MSG": msg, "$TITLE": title})
      let [domain, service] = this.config.action.split(".");
      this.hass.callService(domain, service, data);
    }else{
      for (let t of this.targets) {
        let [domain, target = null] = t.split(".");
        if(target === null){
          target = domain;
          domain = "notify";
        }
  
        if(domain === "tts"){
          this.hass.callService(domain, target, {"entity_id": this.config.service, "media_player_entity_id": this.config.entity, "message": msg});
        } else {
          this.hass.callService(domain, target, {message: msg, title: title, data: this.config.data});
        }
      }
    }

    this.content.querySelectorAll("ha-textfield").forEach(e => e.value = "");
  }

  keydown(e){
    if(e.code == "Enter") this.send();
  }
}

customElements.define('notify-card', NotifyCard);

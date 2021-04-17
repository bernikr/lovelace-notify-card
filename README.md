# Notify Card for Lovelace/Home Assistant
This simple card allows you to notify any notification service manually from the dashboard.

## Install
### Install via HACS
1. Click `Custom Repository` in the upper right menu
2. Enter `bernikr/lovelace-notify-card` and select `Lovelace` as category
3. Click install

### Manual install
1. Copy the `notify-card.js` file to your `config/www` folder
2. Add a reference in the resoruce config:

```
resources:
  - url: /local/notify-card.js
    type: module
```

## Config
Example config:

```
type: 'custom:notify-card'
target: living_room_tv
label: Notify TV
```

- `label` is optional and controlls the placeholder text
- `target` is the name of the notify-service that should get called without the `notify.` domain. (For `notify.notify` put in `notify`, for `notify.telegram` put in `telegram`, etc.)

You can also specify multiple notification services like this:

```
type: 'custom:notify-card'
target:
- living_room_tv
- notify
```

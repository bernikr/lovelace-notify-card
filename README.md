# Notify Card for Lovelace/Home Assistant

[!["Buy Me A Coffee"](https://img.shields.io/static/v1?label=buy%20me%20a&message=coffe&color=FFDD00&logo=buymeacoffee&style=flat-square)](https://buymeacoffee.com/bernikr)
[!["Chat on Telegram"](https://img.shields.io/static/v1?label=chat&message=Telegram&color=26A5E4&logo=telegram&style=flat-square)](https://t.me/bernikr)

This simple card allows you to notify any notification service manually from the dashboard.

![card](card.jpg)

## Install
### Install via HACS
1. Go to the "Frontend"-tab in HACS
2. Click on "Explore & Add Repositories"
3. Search for `Notify Card`
5. Click "Install this Repository in HACS"

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
title: Send Notification
label: Notify TV
```

- `target` is the name of the notify-service that should get called without the `notify.` domain. (For `notify.notify` put in `notify`, for `notify.telegram` put in `telegram`, etc. If your service is not under the `notify.` domain, use the full service name, example: `script.notify_tv`)
- `label` is optional and controlls the placeholder text
- `title` is optional and controlles the card title

You can also specify multiple notification services like this:

```
type: 'custom:notify-card'
target:
- living_room_tv
- notify
```

If your notification service requires additional data (e.g. Alexa) you can include it like this:
```
type: 'custom:notify-card'
target: alexa_media_living_room
data:
  type: announce
```

![shallot](https://github.com/blackwaterbread/poro/assets/40688555/7193cd47-7510-4b9f-812c-b0f98d4d66a2)
# Shallot
Server information display bot for Bohemia Interactive's games

## Features
* Display server information on Discord channel
* Display players name
* Any users can add their own server
* Automatically delete disconnected servers from the list
* Allows specify a priority server
    - Priority server: privilege that exemption automatic delete from list

## Plan
* English Translation
* More games support

## Supported
* [Arma 3](https://store.steampowered.com/app/107410/Arma_3/)
* [Arma: Cold War Assualt (a.k.a Operation Flashpoint: Resistance)](https://store.steampowered.com/app/65790/ARMA_Cold_War_Assault/)

# Usage
## Requirement
* [Node.js 20.x LTS or Upper](https://nodejs.org)

## Installation
```
git clone https://github.com/blackwaterbread/Shallot
```
And should write Configs with reference to the following.

## Configuration
### configs.json
Initialize
```
{
    "token": "Your-Discord-Bot-Token",
    "app_id": "Your-Discord-Bot-AppID",
    "static_path": "Path-where-static-files-will-be-stored"
}
```

### instances.json
Basically, if the messageId value is empty, shallot will resend it.

Initialize
```
[
    [
        "ServerID",
        {
            ...,
            "channels": {
                "interaction": {
                    ...,
                    "channelId": "Interaction-Channel-ID-that-you-want-to-use-on-your-server"
                },
                "servers": {
                    "channelId": "ServerList-Channel-ID-that-you-want-to-use-on-your-server"
                }
            },
            "instances": {
                ...
            },
        }
    ]
]
```

Adding priority server (* Not required)
```
...,
"instances": {
    ...,
    "priority": [
        [
            "Any ID",
            {
                "isPriority": true,
                "hostname": "",
                "messageId": "",
                "game": "Your-Game-Name", 
                "registeredUser": {
                    "id": "0",
                    "displayName": "Priority",
                    "url": "https://discordapp.com/users/{Your-Bot-ID}",
                    "avatarUrl": "Your-Bot-AvatarUrl"
                },
                "connection": {
                    "host": "Your-Server-IP",
                    "port": Your-Server-Port
                },
                "players": [],
                "memo": "Some-Memo",
                "disconnectedFlag": 4,
                "loadedContentHash": "",
                "presetPath": ""
            }
        ]
    ]
}
```

## Start
```
yarn install
yarn build
node dist/shallot.js or pm2 start dist/shallot.js
```

---

# Contact
* [@dayrain](https://discord.com/users/119027576692801536)

# Thanks to
* [Ryan Grupp](https://code.clearbackblast.com/Theowningone) / [Voss](https://code.clearbackblast.com/Theowningone/voss)

# Disclaimer
* [Shallot](https://namu.wiki/w/%EC%83%AC%EB%A1%AF(%ED%8C%A5%EC%A5%90%20%EC%8B%9C%EB%A6%AC%EC%A6%88)) is the character of Korean YouTuber named [potg](https://www.youtube.com/channel/UCw4MwGSaNYbG0cKV02Kq6tw)
* This project does not have any rights over this character.
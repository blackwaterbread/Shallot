![shallot](https://github.com/blackwaterbread/poro/assets/40688555/7193cd47-7510-4b9f-812c-b0f98d4d66a2)

### [[**한국어**]](https://github.com/blackwaterbread/Shallot/blob/master/README.ko.md)

# Shallot
Server information display discord bot for [**ArmA Series**](https://en.wikipedia.org/wiki/Arma_(series))

## Features
* Display server information on Discord channel
* Display players name
* Any users can add their own server
* Automatically delete disconnected servers from the list

## Supported Games
* [**Arma 3**](https://store.steampowered.com/app/107410/Arma_3/)
* [**Arma Reforger**](https://store.steampowered.com/app/1874880/Arma_Reforger/)
* [**Arma: Cold War Assualt (a.k.a Operation Flashpoint: Resistance)**](https://store.steampowered.com/app/65790/ARMA_Cold_War_Assault/)

# Usage
## Requirement
* [**Node.js 20.x LTS or Upper**](https://nodejs.org)

## Installation
```
git clone https://github.com/blackwaterbread/Shallot
```

## Configuration
### Required
### configs.json
```
{
    "token": "Your-Discord-Bot-Token",
    "appId": "Your-Discord-Bot-AppID",
    ...
}
```

### Optional
### Static File Server
* This setting is non-essential; however, if not set this, the preset auto-creation feature will not work.
* You must have a static file server that works with a static path.
* Recommend 'attachment' for static file server HTTP headers.
```
{
    ...
    static: {
        path: "Path-where-static-files-will-be-stored",
        url: "Your-static-file-server-url"
    }
}
```

### Language
* Default is en-US
```
{
    ...
    lang: "en-US" or "ko-KR"
}
```

### storage.json
```
Basically, do not need to modify this.
```

## Start
```
yarn install
yarn build
node dist/shallot.js or pm2 start dist/shallot.js
```

## Initalize on Discord
1. 3 channels must be created. **interaction, status, admin** (can change the channel name what you want)
2. Specifies the channel ID to use with the **/initalize** command

## License
* MIT License

---

# Contact
* [**@dayrain**](https://discord.com/users/119027576692801536)

# Thanks to
* [**Ryan Grupp**](https://code.clearbackblast.com/Theowningone) / [**Voss**](https://code.clearbackblast.com/Theowningone/voss)

# Disclaimer
* [**Shallot**](https://namu.wiki/w/%EC%83%AC%EB%A1%AF(%ED%8C%A5%EC%A5%90%20%EC%8B%9C%EB%A6%AC%EC%A6%88)) is the character of Korean YouTuber named [**@potg**](https://www.youtube.com/channel/UCw4MwGSaNYbG0cKV02Kq6tw)
* This project does not have any rights over this character.
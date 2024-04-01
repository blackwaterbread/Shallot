![shallot](https://github.com/blackwaterbread/poro/assets/40688555/7193cd47-7510-4b9f-812c-b0f98d4d66a2)
# Shallot
[아르마](https://en.wikipedia.org/wiki/Arma_(series)) 시리즈의 서버 현황을 나타내주는 디스코드 봇

## 기능
* 디스코드 채널에 서버 현황 표시
* 현재 서버에 있는 플레이어 이름 표시
* 디스코드 서버의 아무나 자신의 서버를 추가할 수 있음
* 오프라인인 서버는 현황 리스트에서 자동 삭제

## 지원 게임
* [Arma 3](https://store.steampowered.com/app/107410/Arma_3/)
* [Arma Reforger](https://store.steampowered.com/app/1874880/Arma_Reforger/)
* [Arma: Cold War Assualt (a.k.a Operation Flashpoint: Resistance)](https://store.steampowered.com/app/65790/ARMA_Cold_War_Assault/)

# 사용법
## 요구 사항
* [Node.js 20.x LTS 혹은 상위 버전](https://nodejs.org)

## 설치
```
git clone https://github.com/blackwaterbread/Shallot
```

## 설정
### 필수
### configs.json
```
{
    "token": "디스코드 봇 토큰",
    "appId": "디스코드 봇 ID",
    ...
}
```

### 정적 파일 서버
* 이 설정은 필수는 아닙니다. 하지만 설정되지 않으면 아르마 3 프리셋 자동 생성 기능이 동작하지 않습니다.
* 정적 파일 저장 경로와 연결된 정적 파일 서버가 존재해야 합니다.
* 정적 파일 서버 HTTP 헤더는 attachment를 권장합니다.
```
{
    ...
    static: {
        path: "Path-where-static-files-will-be-stored",
        url: "Your-static-file-server-url"
    }
}
```

### 언어 설정
* 기본값은 en-US 입니다.
```
{
    ...
    lang: "en-US" or "ko-KR"
}
```

### storage.json
```
일반적으로 수정할 필요 없습니다.
```

## 시작
```
yarn install
yarn build
node dist/shallot.js or pm2 start dist/shallot.js
```

## Discord 서버에서 초기 설정
1. 채널 3개가 필요합니다. **상호작용, 현황, 관리** (이름은 마음대로 바꾸실 수 있습니다.)
2. **/initalize** 명령어로 각 채널 ID를 등록하면 Shallot 봇을 사용할 수 있습니다.

## 라이센스
* MIT License

---

# Contact
* [@dayrain](https://discord.com/users/119027576692801536)

# Thanks to
* [Ryan Grupp](https://code.clearbackblast.com/Theowningone) / [Voss](https://code.clearbackblast.com/Theowningone/voss)

# Disclaimer
* [Shallot](https://namu.wiki/w/%EC%83%AC%EB%A1%AF(%ED%8C%A5%EC%A5%90%20%EC%8B%9C%EB%A6%AC%EC%A6%88)) is the character of Korean YouTuber named [potg](https://www.youtube.com/channel/UCw4MwGSaNYbG0cKV02Kq6tw)
* This project does not have any rights over this character.
import { ShallotStrings } from "Types";

import appJson from 'Root/package.json';

const KR_STRINGS: ShallotStrings = {
    none: '없음',
    commands: {
        assertGuild: {
            noGuild: ':x: GuildID가 존재하지 않습니다.'
        },
        assertGuildStorage: {
            noGuild: ':x: 아직 채널 설정을 완료하지 않은 것 같습니다.'
        },
        assertServer: {
            noServer: ':x: 잘못된 서버 ID입니다.',
            noRcon: ':x: RCon 기능이 활성화되지 않은 서버입니다.'
        },
        /*
        setLanguage: {
            description: '언어 설정',
            options: {
                descriptionLang: '언어 (en-US, ko-KR)'
            },
            success: ':white_check_mark: 언어 설정이 완료되었습니다.',
            noLang: ':x: 지원하지 않는 언어입니다.'
        },
        */
        initalize: {
            description: '디스코드 서버 등록',
            options: {
                descriptionInteractionChannelId: '서버 등록/삭제 채널 ID',
                descriptionStatusChannelId: '서버 현황 채널 ID',
                descriptionAdminChannelId: '서버 관리 채널 ID',
            },
            success: ':white_check_mark: 디스코드 서버 등록이 완료되었습니다.',
        },
        setChannels: {
            description: '필수 채널 설정',
            options: {
                descriptionInteractionChannelId: '서버 등록/삭제 채널 ID',
                descriptionStatusChannelId: '서버 현황 채널 ID',
                descriptionAdminChannelId: '서버 관리 채널 ID'
            },
            success: ':white_check_mark: 채널이 등록되었습니다.',
        },
        registerMessages: {
            description: '상호작용 메세지들을 등록합니다.',
            noChannel: ':x: 채널이 존재하지 않는 것 같습니다.',
            success: ':white_check_mark: 작업이 완료되었습니다.'
        },
        cleanServers: {
            description: '서버 리스트를 전부 삭제합니다.',
            noGuild: ':x: 아직 채널 설정을 완료하지 않은 것 같습니다.',
            success: ':white_check_mark: 서버 리스트를 초기화 했습니다.'
        },
        uid2guid: {
            description: 'SteamID를 GUID로 변환합니다.',
            options: {
                descriptionSteamID: 'SteamID'
            },
            uncatchedError: ':x: 잘못된 입력값입니다.'
        },
        rcon: {
            description: 'RCon 명령 실행',
            options: {
                descriptionServerID: '서버 ID',
                descriptionCommand: '명령'
            },
            blankDataReceived: ':grey_question: 연결은 정상적으로 되었으나 빈 데이터가 수신되었습니다.',
            uncatchedError: ':x: 뭔가 잘못되었습니다.'
        }
    },
    embed: {
        notice: {
            title: ':beginner: 안내',
            description: '[Shallot](https://github.com/blackwaterbread/Shallot)은 서버 정보를 실시간으로 나타내 주는 봇입니다.\n' +
            '각종 문의 / 버그 신고: [@dayrain](https://discordapp.com/users/119027576692801536)\n'
        },
        serverRegister: {
            title: ':rocket: 서버 등록',
            description: '서버 리스트에 등록할 게임을 선택해주세요.',
            footer: '* 1인당 하나만 등록할 수 있습니다.\n' +
            '* 고정된 서버를 제외하고 1분간 응답이 없을 시 자동으로 삭제됩니다.\n' +
            '* 짧은 시간에 너무 많은 요청 시 잠시 이용이 제한될 수 있습니다.',
            button: {
                labelArma3: '아르마 3',
                labelReforger: '아르마: 리포저',
                labelOfp: '오플포'
            }
        },
        serverDelete: {
            title: ':x: 내 서버 삭제',
            description: '내가 등록한 서버를 삭제합니다.',
            footer: '* 짧은 시간에 너무 많은 요청 시 잠시 이용이 제한될 수 있습니다.',
            button: {
                labelDetele: '삭제'
            }
        },
        players: {
            title: ':playground_slide: 플레이어 현황',
            footer: '플레이어 확인 버튼을 누른 시점의 목록입니다.'
        },
        rcon: {
            field: {
                nameRconActivated: 'RCon 활성화',
                namePriority: '우선권',
                nameAddonsHash: '컨텐츠 해시'
            },
            button: {
                labelRconActivate: 'RCon 활성화',
                labelRconDeactivate: 'RCon 비활성화',
                labelServerModify: '수정',
                labelServerDelete: '서버 삭제'
            }
        },
        serverStatus: {
            arma3: {
                field: {
                    labelMod: '모드',
                    labelStatus: '상태',
                    labelMap: '맵',
                    labelVersion: '버전',
                    labelPlayers: '플레이어',
                    labelCDLC: 'CDLC',
                    labelMemo: '메모'
                },
                presetDownload: '프리셋 다운로드'
            },
            armareforger: {
                field: {
                    labelMap: '맵',
                    labelVersion: '버전',
                    labelPlayers: '플레이어',
                    labelMemo: '메모'
                }
            },
            armaresistance: {
                field: {
                    labelMods: '모드',
                    labelStatus: '상태',
                    labelMap: '맵',
                    labelVersion: '버전',
                    labelPlayers: '플레이어',
                    labelMemo: '메모'
                }
            },
            offline: {
                title: '오프라인',
                field: {
                    labelStatus: '상태',
                    labelMemo: '메모'
                }
            },
            button: {
                labelCheckPlayers: '플레이어 확인'
            },
            labelBlankMemo: '메모가 없습니다.'
        }
    },
    interaction: {
        button: {
            serverModify: {
                noServer: ':x: 오류: 존재하지 않는 서버입니다.'
            },
            serverDelete: {
                deletedServer: ':wave: 서버가 삭제되었습니다.'
            },
            adminRconRegister: {
                noServer: ':x: 오류: 존재하지 않는 서버입니다.'
            },
            adminRconDelete: {
                rconDeactivated: ':wave: RCon이 비활성화 되었습니다.',
                noServer: ':x: 오류: 존재하지 않는 서버입니다.',
            }
        },
        modalSubmit: {
            serverRegister: {
                checkingValidation: ':tools: 유효성 확인 중입니다...',
                connectingServer: ':rocket: 서버 연결 중입니다...',
                duplicatedServer: ':x: 이미 리스트에 존재하는 서버입니다.',
                unsupportedSerrverType: ':x: Shallot 오류입니다: 지원하지 않는 게임입니다.',
                failedConnectServer: ':x: 서버에 연결할 수 없습니다.',
                success: ':white_check_mark: 서버가 등록되었습니다.',
                uncatchedError: ':x: Shallot 오류로 인해 서버에 연결할 수 없습니다.'
            },
            serverModify: {
                checkingValidation: ':tools: 유효성 확인 중입니다...',
                noServer: ':x: 서버가 존재하지 않습니다.',
                success: ':white_check_mark: 서버 정보가 수정되었습니다.'
            },
            rconRegister: {
                checkingValidation: ':tools: 유효성 확인 중입니다...',
                noServer: ':x: 서버가 존재하지 않습니다.',
                success: ':white_check_mark: RCon 접속 정보를 추가했습니다.'
            },
        },
        misc: {
            wrongPort: ':x: 잘못된 포트입니다. 포트는 0 ~ 65535의 범위를 가집니다.',
            wrongIP: ':x: 잘못된 IP입니다.',
            noPermission: ':x: 권한이 없습니다.'
        }
    },
    message: {
        stanbyEmbed: {
            content: 'Embed를 생성 중입니다...'
        }
    },
    modal: {
        serverRegister: {
            title: '서버 등록',
            inputIpAddr: {
                label: '서버 접속 주소 (포트 기본값: 2302)',
                placeholder: '127.0.0.1 or 127.0.0.1:2302'
            },
            inputMemo: {
                label: '메모',
                placeholder: '자동으로 제공되는 정보 외에 따로 공지할만한 내용'
            }
        },
        serverModify: {
            title: '서버 정보 수정',
            inputIpAddr: {
                label: '서버 접속 주소 (포트 기본값: 2302)'
            },
            inputPriority: {
                label: '우선권 (true or false)'
            },
            inputMemo: {
                label: '메모'
            }
        },
        rconRegister: {
            title: 'RCon 정보 수정',
            inputRconPort: {
                label: 'RCon 접속 포트',
            },
            inputRconPassword: {
                label: 'RCon 접속 암호'
            }
        }
    },
    preset: {
        arma3: {
            generated: `${appJson.displayName} Discord 봇에 의해서 생성되었습니다. 아르마 3 런쳐에 드래그하여 프리셋 적용`
        }
    }
} as const;

export default KR_STRINGS;
import { Arma3ServerQueries } from "Server/Games/Arma3";
import { ArmaReforgerServerQueries } from "Server/Games/ArmaReforger";
import { ArmaResistanceServerQueries } from "Server/Games/ArmaResistance";

export const Games = {
    arma3: {
        name: 'Arma 3',
        type: 'arma3'
    },
    armareforger: {
        name: 'Arma Reforger',
        type: 'armareforger'
    },
    armaresistance: {
        name: 'Operation Flashpoint: Resistance',
        type: 'armaresistance'
    },
    unknown: {
        name: 'Unknown',
        type: 'unknown'
    }
} as const;

export const SERVER_STATUS_COLOR = {
    connected: 0x41F097,
    disconnected: 0xFF0000,
    losing: 0xFFCC00,
    discord: 0x5865F2
} as const;

export interface ConnectInfo { 
    host: string; 
    port: number;
}

export type AvailableGame = keyof typeof Games;

export interface ServerQueries<ServerRawQueries> {
    game: AvailableGame,
    connect: ConnectInfo,
    query?: ServerRawQueries
}

export type CommonServerQueries = ServerQueries<Arma3ServerQueries> | ServerQueries<ArmaReforgerServerQueries> | ServerQueries<ArmaResistanceServerQueries>;

export interface ShallotStrings {
    none: string;
    commands: {
        assertGuild: {
            noGuild: string;
        },
        assertGuildStorage: {
            noGuild: string;
        },
        assertServer: {
            noServer: string;
            noRcon: string;
        },
        /*
        setLanguage: {
            description: string;
            options: {
                descriptionLang: string;
            },
            success: string;
            noLang: string;
        },
        */
        initalize: {
            description: string;
            options: {
                descriptionInteractionChannelId: string;
                descriptionStatusChannelId: string;
                descriptionAdminChannelId: string;
            },
            success: string;
        },
        setChannels: {
            description: string;
            options: {
                descriptionInteractionChannelId: string;
                descriptionStatusChannelId: string;
                descriptionAdminChannelId: string;
            },
            success: string;
        },
        registerMessages: {
            description: string;
            noChannel: string;
            success: string;
        },
        servers: {
            description: string;
        },
        cleanServers: {
            description: string;
            success: string;
        },
        uid2guid: {
            description: string;
            options: {
                descriptionSteamID: string;
            },
            uncatchedError: string;
        },
        rcon: {
            description: string;
            options: {
                descriptionServerID: string;
                descriptionCommand: string;
            },
            blankDataReceived: string;
            uncatchedError: string;
        },
        maintenance: {
            description: string;
            options: {
                descriptionServerID: string;
                descriptionActivation: string;
            },
            noServer: string;
            success: string;
        },
    },
    embed: {
        notice: {
            title: string;
            description: string;
        },
        serverRegister: {
            title: string;
            description: string;
            footer: string;
            button: {
                labelArma3: string;
                labelReforger: string;
                labelOfp: string;
            }
        },
        serverDelete: {
            title: string;
            description: string;
            footer: string;
            button: {
                labelDetele: string;
            }
        },
        players: {
            title: string;
            footer: string;
        },
        maintenance: {
            title: string;
            description: string;
        },
        rcon: {
            field: {
                nameRconActivated: string;
                namePriority: string;
                nameAddonsHash: string;
            },
            button: {
                labelRconActivate: string;
                labelRconDeactivate: string;
                labelServerModify: string;
                labelServerDelete: string;
            }
        },
        serverStatus: {
            arma3: {
                field: {
                    labelMod: string;
                    labelStatus: string;
                    labelMap: string;
                    labelVersion: string;
                    labelPlayers: string;
                    labelCDLC: string;
                    labelMemo: string;
                },
                presetPurchasedDownload: string;
                presetCompatibilityDownload: string;
            },
            armareforger: {
                field: {
                    labelMap: string;
                    labelVersion: string;
                    labelPlayers: string;
                    labelMemo: string;
                }
            },
            armaresistance: {
                field: {
                    labelMods: string;
                    labelStatus: string;
                    labelMap: string;
                    labelVersion: string;
                    labelPlayers: string;
                    labelMemo: string;
                }
            },
            offline: {
                title: string;
                field: {
                    labelStatus: string;
                    labelMemo: string;
                }
            },
            button: {
                labelCheckPlayers: string;
            },
            labelBlankMemo: string;
        },
    },
    interaction: {
        button: {
            serverModify: {
                noServer: string;
            },
            serverDelete: {
                deletedServer: string;
            },
            adminRconRegister: {
                noServer: string;
            },
            adminRconDelete: {
                rconDeactivated: string;
                noServer: string;
            }
        },
        modalSubmit: {
            serverRegister: {
                checkingValidation: string;
                connectingServer: string;
                duplicatedServer: string;
                unsupportedSerrverType: string;
                failedConnectServer: string;
                success: string;
                uncatchedError: string;
            },
            serverModify: {
                checkingValidation: string;
                noServer: string;
                success: string;
            },
            rconRegister: {
                checkingValidation: string;
                noServer: string;
                success: string;
            }
        },
        misc: {
            wrongPort: string;
            wrongIP: string;
            noPermission: string;
        }
    },
    message: {
        stanbyEmbed: {
            content: string;
        },
    },
    modal: {
        serverRegister: {
            title: string;
            inputIpAddr: {
                label: string;
                placeholder: string;
            },
            inputMemo: {
                label: string;
                placeholder: string;
            }
        },
        serverModify: {
            title: string;
            inputIpAddr: {
                label: string;
            },
            inputPriority: {
                label: string;
            },
            inputMemo: {
                label: string;
            }
        },
        rconRegister: {
            title: string;
            inputRconPort: {
                label: string;
            },
            inputRconPassword: {
                label: string;
            }
        }
    },
    preset: {
        arma3: {
            generated: string;
        }
    }
}
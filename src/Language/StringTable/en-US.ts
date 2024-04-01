import { ShallotStrings } from "Types";

import appJson from 'Root/package.json';

const EN_STRINGS: ShallotStrings = {
    none: 'None',
    commands: {
        assertGuild: {
            noGuild: ':x: GuildID does not exist.'
        },
        assertGuildStorage: {
            noGuild: ':x: Looks like initalize has been done yet.'
        },
        assertServer: {
            noServer: ':x: Invalid server ID.',
            noRcon: ':x: RCon feature is not enabled on this server.'
        },
        /*
        setLanguage: {
            description: 'Language Settings',
            options: {
                descriptionLang: 'Langauge (en-US, ko-KR)'
            },
            success: ':white_check_mark: Language setting complete.',
            noLang: ':x: Unsupported language.'
        },
        */
        initalize: {
            description: 'Register Discord Server',
            options: {
                descriptionInteractionChannelId: 'Server Registration/Deletion Channel ID',
                descriptionStatusChannelId: 'Server Status Channel ID',
                descriptionAdminChannelId: 'Server Management Channel ID',
            },
            success: ':white_check_mark: Discord server registration complete.',
        },
        setChannels: {
            description: 'Required Channel Settings',
            options: {
                descriptionInteractionChannelId: 'Server Registration/Deletion Channel ID',
                descriptionStatusChannelId: 'Server Status Channel ID',
                descriptionAdminChannelId: 'Server Management Channel ID'
            },
            success: ':white_check_mark: Channel registered.',
        },
        registerMessages: {
            description: 'Register interaction messages.',
            noChannel: ':x: Channel does not appear to exist.',
            success: ':white_check_mark: Task complete.'
        },
        servers: {
            description: 'Load server list.'
        },
        cleanServers: {
            description: 'Delete all server lists.',
            success: ':white_check_mark: Deleted all server list.'
        },
        uid2guid: {
            description: 'Converts the SteamID to the GUID.',
            options: {
                descriptionSteamID: 'SteamID'
            },
            uncatchedError: ':x: Invalid input value.'
        },
        rcon: {
            description: 'Run RCon Commands',
            options: {
                descriptionServerID: 'Server ID',
                descriptionCommand: 'Commands'
            },
            blankDataReceived: ':grey_question: The connection was successful, but empty data was received.',
            uncatchedError: ':x: Something is wrong.'
        }
    },
    embed: {
        notice: {
            title: ':beginner: Notice',
            description: '[Shallot](https://github.com/blackwaterbread/Shallot) is a bot that display server status in real time.\n' +
            'Contact / Bug Reports: [@dayrain](https://discordapp.com/users/119027576692801536)\n'
        },
        serverRegister: {
            title: ':rocket: Server Registration',
            description: 'Please select a game to register in the server list.',
            footer: '* Only one server can be registered per person.\n' +
            '* Automatically deleted when there\'s no response for 1 minute except for the Priority server.\n' +
            '* Too many requests in a short period of time may restrict request.',
            button: {
                labelArma3: 'Arma 3',
                labelReforger: 'Arma: Reforger',
                labelOfp: 'Arma: Resistance'
            }
        },
        serverDelete: {
            title: ':x: Delete My Server',
            description: 'Delete the server i registered',
            footer: '* Too many requests in a short period of time may restrict request.',
            button: {
                labelDetele: 'Delete'
            }
        },
        players: {
            title: ':playground_slide: Player Status',
            footer: 'List of Players when button was pressed.'
        },
        rcon: {
            field: {
                nameRconActivated: 'RCon Activation',
                namePriority: 'Priority',
                nameAddonsHash: 'Contents Hash'
            },
            button: {
                labelRconActivate: 'RCon Activate',
                labelRconDeactivate: 'RCon Deactivate',
                labelServerModify: 'Modify',
                labelServerDelete: 'Delete'
            }
        },
        serverStatus: {
            arma3: {
                field: {
                    labelMod: 'Mod',
                    labelStatus: 'Status',
                    labelMap: 'Map',
                    labelVersion: 'Version',
                    labelPlayers: 'Players',
                    labelCDLC: 'CDLC',
                    labelMemo: 'Memo'
                },
                presetDownload: 'Get Preset HTML'
            },
            armareforger: {
                field: {
                    labelMap: 'Map',
                    labelVersion: 'Version',
                    labelPlayers: 'Players',
                    labelMemo: 'Memo'
                }
            },
            armaresistance: {
                field: {
                    labelMods: 'Mods',
                    labelStatus: 'Status',
                    labelMap: 'Map',
                    labelVersion: 'Version',
                    labelPlayers: 'Players',
                    labelMemo: 'Memo'
                }
            },
            offline: {
                title: 'Offline',
                field: {
                    labelStatus: 'Status',
                    labelMemo: 'Memo'
                },
            },
            button: {
                labelCheckPlayers: 'Check Players'
            },
            labelBlankMemo: 'There\'s no memo.'
        }
    },
    interaction: {
        button: {
            serverModify: {
                noServer: ':x: Error: This server does not exist.'
            },
            serverDelete: {
                deletedServer: ':wave: Your server has been deleted.'
            },
            adminRconRegister: {
                noServer: ':x: Error: This server does not exist.'
            },
            adminRconDelete: {
                rconDeactivated: ':wave: RCon is disabled.',
                noServer: ':x: Error: This server does not exist.',
            }
        },
        modalSubmit: {
            serverRegister: {
                checkingValidation: ':tools: Validating...',
                connectingServer: ':rocket: Connecting server...',
                duplicatedServer: ':x: This server already exists in the list.',
                unsupportedSerrverType: ':x: Shallot Error: This game not supported.',
                failedConnectServer: ':x: Unable to connect to server.',
                success: ':white_check_mark: Server registered.',
                uncatchedError: ':x: Unable to connect to the server.'
            },
            serverModify: {
                checkingValidation: ':tools: Validating...',
                noServer: ':x: This server does not exist.',
                success: ':white_check_mark: Server information has been modified.'
            },
            rconRegister: {
                checkingValidation: ':tools: Validating...',
                noServer: ':x: This server does not exist.',
                success: ':white_check_mark: Added RCon connection information.'
            },
        },
        misc: {
            wrongPort: ':x: Invalid port. The port ranges from 0 to 65535.',
            wrongIP: ':x: Invalid IP.',
            noPermission: ':x: You don\'t have permission.'
        }
    },
    message: {
        stanbyEmbed: {
            content: 'Generating Embed...'
        }
    },
    modal: {
        serverRegister: {
            title: 'Register Server Information',
            inputIpAddr: {
                label: 'Server Address:Port (Default Port: 2302)',
                placeholder: '127.0.0.1 or 127.0.0.1:2302'
            },
            inputMemo: {
                label: 'Memo',
                placeholder: 'Additional Memo'
            }
        },
        serverModify: {
            title: 'Modify Server Information',
            inputIpAddr: {
                label: 'Server Address:Port (Default Port: 2302)'
            },
            inputPriority: {
                label: 'Priority (true or false)'
            },
            inputMemo: {
                label: 'Memo'
            }
        },
        rconRegister: {
            title: 'Modify RCon Information',
            inputRconPort: {
                label: 'RCon Port',
            },
            inputRconPassword: {
                label: 'RCon Password'
            }
        }
    },
    preset: {
        arma3: {
            generated: `Generated by ${appJson.displayName} Discord Bot. Drag onto Arma 3 launcher to apply presets.`
        }
    }
} as const;

export default EN_STRINGS;
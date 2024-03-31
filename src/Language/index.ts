import KR_STRINGS from "Language/StringTable/ko-KR";
import EN_STRINGS from "Language/StringTable/en-US";
import { getConfigs } from "Config";

const configs = getConfigs();

export function getStringTable() {
    // if (!lang) return StringTable['en-US'];
    const table = StringTable[configs.lang];
    if (table) return table;
    else throw new Error('[App] Invalid language locale');
}

export const StringTable = {
    'ko-KR': KR_STRINGS,
    'en-US': EN_STRINGS
} as const;
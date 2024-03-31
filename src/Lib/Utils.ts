import _ from "lodash";
import { pipe, split, toArray } from "iter-ops";
import { createHash } from 'crypto';
import { DateTime } from "luxon";

export function byteSplit(buffer: Buffer, seperator: number) {
    return pipe(
        buffer,
        split(byte => byte === seperator),
        toArray()
    ).first?.map(x => Buffer.from(x));
}

export function getBoolean(value: string | number): boolean {
    if (typeof value === 'string') {
        if (value === 'true' || value == 'True') return true;
        else if (value === 'false' || value == 'False') return false;
        else if (value === 't' || value == 'T') return true;
        else return false;
    }
    else if (typeof value === 'number')
        if (value === 0x74) return true; // 't'
        else if (value === 0x66) return false; // 'f'
        else return value === 0 ? false : true;
    else
        return false;
}

export function insertChar(str: string, char: string, pos: number): string {
    return str.slice(0, pos) + char + str.slice(pos);
}

export function advStringify(object: any) {
    for (const eachIdx in object) {
        if (object[eachIdx] instanceof Map) {
            object[eachIdx] = Array.from(object[eachIdx]);
            advStringify(object);
        } else if (typeof object[eachIdx] == 'object') advStringify(object[eachIdx]);
    }
    return JSON.stringify(object, null, 4);
};

export function judgePing(ping?: number) {
    return ping ? ping < 80 ? 'good.png' : ping > 200 ? 'poor.png' : 'bad.png' : 'poor.png';
}

export function toEmptySafeObject(input: { [key: string]: any }) {
    /* there's explosion when an empty string in discord embed */
    const p = _.cloneDeep(input);
    Object.entries(p).forEach(([k, v]) => {
        if (_.isEmpty(v) && typeof v === 'string') p[k] = 'None';
    });
    return p;
}

export function uid2guid(uid: string) {
    const steamId = BigInt(uid);
    const bytes = [];

    for (let i = 0; i < 8; i++) {
        bytes.push(Number((steamId >> (BigInt(8) * BigInt(i))) & BigInt(0xFF)));
    }

    const guid = createHash('md5')
        .update(Buffer.from([0x42, 0x45, ...bytes]))
        .digest('hex');

    return guid;
};

/*
export function getRconOwnedString(rconSession?: RconSession) {
    if (rconSession?.user) {
        const { user } = rconSession;
        const expired = DateTime.fromSeconds(rconSession.expired).toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
        return `[${user.id}:${user.displayName}|Expired:${expired}]`;
    }
    else {
        return 'None';
    }
}
*/
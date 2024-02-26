import { pipe, split, toArray } from "iter-ops";

export function byteSplit(buffer: Buffer, seperator: number) {
    return pipe(
        buffer,
        split(byte => byte === seperator),
        toArray()
    ).first?.map(x => Buffer.from(x));
}

export function getBoolean(value: string | number): boolean {
    if (typeof value === 'string')
        return value === 't' ? true : false;
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
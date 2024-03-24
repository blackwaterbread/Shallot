import { GameDig, QueryOptions } from "gamedig";
import { Arma3ServerQueries } from "./Games/Arma3";
import { ArmaReforgerServerQueries } from "./Games/ArmaReforger";
import { ArmaResistanceServerQueries } from "./Games/ArmaResistance";

export type ServerQueries = Arma3ServerQueries | ArmaReforgerServerQueries | ArmaResistanceServerQueries;

export function query(options: QueryOptions) {
    return GameDig.query({
        ...options
    });
}

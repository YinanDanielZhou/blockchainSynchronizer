import { LLNodeSDO } from "../utiles/dataStructures";
import { loadSDOsCompressed, newLoadSDOsCompressed, persistSDOsCompressed } from "../SDOWorker/diskIO";
import { SpendableDO } from "../../contracts/SpendableDO";
import { integrityCheck, makeupMissingTxn } from "../SDOWorker/integrityCheck";
import { traceOrigin } from "../SDOWorker/originTrace";


SpendableDO.loadArtifact()

let SDO_curr_state = new Map<string, LLNodeSDO>();
let persistence_version: number;
let known_block_height: number;

(async () => {
    let rtn = await newLoadSDOsCompressed(SDO_curr_state, false)
    persistence_version = rtn[0]
    known_block_height = rtn[1]
    
    const needToMakeUp = false

    // const tipTxid = ""
    // const curTxvout = 0
    // await traceOrigin(tipTxid, curTxvout)

    if (needToMakeUp) {
        const missedTxnList = [
           //  "3c2048fd6df593a1d60f066f456ddd03234d1fb39fbba4b822752892f160dd54",
           //  "da82527c5d6e463e6d9b458e54e5a13cb3c4757db6b7b036de73100b3e599ffa",
           //  "58502d8372546dd3a87eca582ee268a84d0a6065136cd2d93dd360b314ebdf1f",
           //  "34be19216cca8473ace002b27efede783c83660a2bbef893f6e18b5a916fdbdb",
           //  "7e900211abf97e1ce134c1b3576263179018794c864aa403f66524d3328c5fd2"
        ]
        for (let txid of missedTxnList) {
            await makeupMissingTxn(txid, SDO_curr_state)
        }
        persistSDOsCompressed(SDO_curr_state, persistence_version + 1, known_block_height);
    } else {
        await integrityCheck(SDO_curr_state)
    }
    

    // 
})();

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
    
    const needToMakeUp = true

    // const tipTxid = ""
    // const curTxvout = 0
    // await traceOrigin(tipTxid, curTxvout)

    if (needToMakeUp) {
        const missedTxnList = [
            "8abcced99af23990aa1104425f21a020f234ba1d67ffa12484b6728d6c8a55b7",
            "7d81af3cf3b383f20ba8176f837ebadd7be333421665c530a3bf724448b78633",
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
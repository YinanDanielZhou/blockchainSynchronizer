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
	   "e66412472972bca3797c984c5ae7e0b0a143043c4bf6c0d90abebd024c99f4f7"
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

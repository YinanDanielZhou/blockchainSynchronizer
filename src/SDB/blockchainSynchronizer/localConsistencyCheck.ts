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
            "6c1f0b452ae6a5e10d78b85599ef07560f8a3255e33c083a0ace932f8304d86c",
            "ea5ffa720b85ae9b6ea0764b110583de16a0e2612e835c2bad8fad301b59ca1a",
           //  "1b9f2a32fe34c30ce993ef3ebbc9be2e10e7b83f22d08585c787c09722bf0b0d",
           //  "ea31378cf9ae29d97132495b5977b6003357515756e95219d0d350d863ab6b73",
           //  "0d8e6a8e7b527bdb208c1c51ca226d7ae1081a83219fe22edc063655ad24b3d4"
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

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

    // const tipTxid = ""
    // const curTxvout = 0
    // await traceOrigin(tipTxid, curTxvout)

    await integrityCheck(SDO_curr_state)

    // const missedTxnList = [
    //     "441f1a8d4711cd3f70d05141c7d44714df28d64aef30a306f2963c5954d2f56b",
    // ]
    // for (let txid of missedTxnList) {
    //     await makeupMissingTxn(txid, SDO_curr_state)
    // }

    // persistSDOsCompressed(SDO_curr_state, persistence_version + 1, known_block_height);
})();
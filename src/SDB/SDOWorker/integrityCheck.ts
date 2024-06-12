import { resourceLimits } from "worker_threads";
import { LLNodeSDO } from "../utiles/dataStructures";
import axios, { AxiosResponse } from 'axios';
import { SpendableDO } from "../../contracts/SpendableDO";
import { prettyString } from "./read";
import { bsv } from "scrypt-ts";
import { localUpdateSDO } from "./diskIO";



async function sendGetRequest(url: string, headers: Record<string, string>): Promise<AxiosResponse<any>> {
    try {
        const response = await axios.get(url, { headers });
        return response;
    } catch (error) {
        throw error;
    }
}

async function getConfirmedUTXOByScript (scriptHash: string) {

    const network = 'main'
    const apiUrl = `https://api.whatsonchain.com/v1/bsv/${network}/script/${scriptHash}/confirmed/unspent`;


    const TaalAPIKey = 'mainnet_939f95f7b15fbf7086ad0a42552c9613'
    const customHeaders = {
        'Content-Type': 'application/json',
        'Authorization': TaalAPIKey
    };

    return sendGetRequest(apiUrl, customHeaders)
}


export async function integrityCheck(SDO_curr_state: Map<string, LLNodeSDO>) {
    // For Each cached SDO, check if it is the most recent verion, (aka the Script has a confirmed UTxO)
    console.log("Checking the integrity of all SDO instances.....")

    const iterator = SDO_curr_state.entries()
    let iter = iterator.next()

    let counter = 1
    while (!iter.done) {
        await getConfirmedUTXOByScript(iter.value[1].this.scriptHash)
        .then((response) => { 
            console.log("  valid", counter, iter.value[1].this.UID)
        })
        .catch(() => { 
            console.log("invalid", counter, iter.value[1].this.UID)
        })
        counter += 1
        iter = iterator.next()
        if (counter % 3 == 0) {
            // TAAl api request is rate limited to 3/sec
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    }
}

async function getRawTxnByHash(hash: string) {
    const network = 'main'
    const apiUrl = `https://api.whatsonchain.com/v1/bsv/${network}/tx/${hash}/hex`;


    const TaalAPIKey = 'mainnet_939f95f7b15fbf7086ad0a42552c9613'
    const customHeaders = {
        'Content-Type': 'application/json',
        'Authorization': TaalAPIKey
    };

    return sendGetRequest(apiUrl, customHeaders)
}

async function getTxnBlockTime(hash: string) {
    const network = 'main'
    const apiUrl = `https://api.whatsonchain.com/v1/bsv/${network}/tx/hash/${hash}`;

    const TaalAPIKey = 'mainnet_939f95f7b15fbf7086ad0a42552c9613'
    const customHeaders = {
        'Content-Type': 'application/json',
        'Authorization': TaalAPIKey
    };

    const response = await sendGetRequest(apiUrl, customHeaders)
    return response.data.blocktime
}   


export async function makeupMissingTxn(txid: string, SDO_curr_state: Map<string, LLNodeSDO>) {
    // After running the integrityCheck, if found a SDO is not the most upto date version
    // run this function to manually synchronize with the blockchain to include those missing txns

    const txnRaw = await getRawTxnByHash(txid)
    const blocktime = await getTxnBlockTime(txid)
    console.log(blocktime)
    const txn = new bsv.Transaction(txnRaw.data)
    
    for (let outIndex = 0; outIndex < txn.outputs.length - 1; outIndex++) {   // the last outIndex is the payment so is ignored
        const sdo = SpendableDO.fromTx(txn, outIndex)
        const prevTxId = txn.inputs[outIndex].prevTxId.toString('hex')    // get the previous sdo state's transaction id
        localUpdateSDO(sdo, blocktime, SDO_curr_state, prevTxId);
    }
}





// import { LLNodeSDO } from "../utiles/dataStructures";
// import axios, { AxiosResponse } from 'axios';
// import { prettyString } from "./read";
// import { bsv } from "scrypt-ts";
// import { localUpdateSDO } from "./diskIO";
// import { SDOOwnerWriter } from "../../contracts/SDO_v7";



// async function sendGetRequest(url: string, headers: Record<string, string>): Promise<AxiosResponse<any>> {
//     try {
//         const response = await axios.get(url, { headers });
//         return response;
//     } catch (error) {
//         throw error;
//     }
// }

// async function sendPostRequest(url: string, postData: Record<string, string[]>, headers: Record<string, string>): Promise<AxiosResponse<any>> {
//     try {
//         const response = await axios.post(url, postData, headers);
//         return response;
//     } catch (error) {
//         throw error;
//     }
// }

// async function getBulkConfirmedUTXOByScript (scriptHashList: string[]) {

//     const network = 'main'
//     const apiUrl = `https://api.whatsonchain.com/v1/bsv/${network}/scripts/confirmed/unspent`;


//     const TaalAPIKey = ''
//     const customHeaders = {
//         'Content-Type': 'application/json',
//         'Authorization': TaalAPIKey
//     };

//     const postData = {
//         'scripts' : scriptHashList
//     }

//     return sendPostRequest(apiUrl, postData, customHeaders)
// }

// export async function getScriptHistory(scriptHash: string) {
//     const network = 'main'
//     const apiUrl = `https://api.whatsonchain.com/v1/bsv/${network}/script/${scriptHash}/confirmed/history`;

//     const TaalAPIKey = ''
//     const customHeaders = {
//         'Content-Type': 'application/json',
//         'Authorization': TaalAPIKey
//     };

//     return sendGetRequest(apiUrl, customHeaders)
// }

// export async function dupScriptDetection(SDO_curr_state: Map<string, LLNodeSDO>) {
//     // For Each cached SDO, check if it is the most recent verion, (aka the Script has a confirmed UTxO)
//     console.log("Find the scripts that have multiple dups....")

//     const iterator = SDO_curr_state.entries()
//     let iter = iterator.next()

//     let counter = 1
//     while (!iter.done) {
//         await getScriptHistory(iter.value[1].this.scriptHash)
//         .then((response) => {
//             if (response.data.result.length > 1) {
//                 console.log(response.data.result.length, response.data.script)
//             }
//         })
//         .catch(() => { 
//             console.log("???")
//         })
//         counter += 1
//         iter = iterator.next()
//         if (counter % 3 == 0) {
//             console.log(counter, " checked.")
//             // TAAl api request is rate limited to 3/sec
//             await new Promise(resolve => setTimeout(resolve, 1000))
//         }
//     }
// }


// export async function integrityCheck(SDO_curr_state: Map<string, LLNodeSDO>) {
//     // For Each cached SDO, check if it is the most recent verion, (aka the Script has a confirmed UTxO)
//     console.log("Checking the integrity of all SDO instances.....")

//     const iterator = SDO_curr_state.entries()
//     let iter = iterator.next()

//     let counter = 1
//     let scriptList : string[] = []
//     let txIdList : string[] = []
//     while (!iter.done) {
//         scriptList.push(iter.value[1].this.scriptHash)
//         txIdList.push(iter.value[1].this.utxo.txId)
//         counter += 1
//         iter = iterator.next()

//         if (scriptList.length == 20 || iter.done) {
//             await getBulkConfirmedUTXOByScript(scriptList).
//             then((response) => {
//                 for (let index = 0; index < response.data.length; index++) {
//                     if (response.data[index].result.length == 0) {
//                         console.log("invalid", scriptList[index])
//                         console.log("Missing   : no valid UTXO")
//                         console.log("Local: ", txIdList[index])
//                     } else if (response.data[index].result[0].tx_hash !== txIdList[index]) {
//                         console.log("invalid", scriptList[index])
//                         console.log("Missing   : ", response.data[index].result[0].tx_hash)
//                         console.log("Local: ", txIdList[index])
//                     } else {
//                         // console.log("  valid", txIdList[index])
//                     }
//                 }
//             })
//             .catch((error) => {
//                 console.error(error)
//             })
//             scriptList = []
//             txIdList = []
//         }
//         if (counter % 60 == 0) {
//             console.log(counter, "done.")
//             // TAAl api request is rate limited to 3/sec
//             await new Promise(resolve => setTimeout(resolve, 1000))
//         }
//     }
// }

// async function getRawTxnByHash(hash: string) {
//     const network = 'main'
//     const apiUrl = `https://api.whatsonchain.com/v1/bsv/${network}/tx/${hash}/hex`;


//     const TaalAPIKey = ''
//     const customHeaders = {
//         'Content-Type': 'application/json',
//         'Authorization': TaalAPIKey
//     };

//     return sendGetRequest(apiUrl, customHeaders)
// }

// async function getTxnBlockTime(hash: string) {
//     const network = 'main'
//     const apiUrl = `https://api.whatsonchain.com/v1/bsv/${network}/tx/hash/${hash}`;

//     const TaalAPIKey = 'mainnet_570776b5deebcb9d280b924e0f615474'
//     const customHeaders = {
//         'Content-Type': 'application/json',
//         'Authorization': TaalAPIKey
//     };

//     const response = await sendGetRequest(apiUrl, customHeaders)
//     return response.data.blocktime
// }   


// export async function makeupMissingTxn(txid: string, SDO_curr_state: Map<string, LLNodeSDO>) {
//     // After running the integrityCheck, if found a SDO is not the most upto date version
//     // run this function to manually synchronize with the blockchain to include those missing txns

//     const txnRaw = await getRawTxnByHash(txid)
//     const blocktime = await getTxnBlockTime(txid)
//     console.log(blocktime)
//     const txn = new bsv.Transaction(txnRaw.data)
    
//     for (let outIndex = 0; outIndex < txn.outputs.length - 1; outIndex++) {   // the last outIndex is the payment so is ignored
//         const sdo = SDOOwnerWriter.fromTx(txn, outIndex)
//         const prevTxId = txn.inputs[outIndex].prevTxId.toString('hex')    // get the previous sdo state's transaction id
//         localUpdateSDO(sdo, blocktime, SDO_curr_state, prevTxId);
//     }
// }





import axios, { AxiosResponse } from 'axios';
import { SpendableDO } from "../../contracts/SpendableDO";
import { prettyString } from "./read";
import { bsv } from "scrypt-ts";



async function sendGetRequest(url: string, headers: Record<string, string>): Promise<AxiosResponse<any>> {
    try {
        const response = await axios.get(url, { headers });
        return response;
    } catch (error) {
        throw error;
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



export async function traceOrigin(tipTxid: string, tipTxvout: number) {
    // For the given SDO, trace its history all the way back to its creation
    console.log(`Tracing the history of SDO back to its deployment.....`)

    let curTxid = tipTxid
    let curTxvout = tipTxvout

    while (true) {
        let curTxn = new bsv.Transaction((await getRawTxnByHash(curTxid)).data) 
        let curSDO
        try {
            curSDO = SpendableDO.fromTx(curTxn, curTxvout)
        } catch (error) {
            console.log("Origin deployment is reached.")
            break;
        }
        console.log(prettyString(curSDO))
        console.log("The previous SDO state is shown below:\n")

        curTxid = curTxn.inputs[curTxvout].prevTxId.toString('hex')
        curTxvout = curTxn.inputs[curTxvout].outputIndex

        // wait a few ms to avoid reaching TAAL's rate limit
        await new Promise(resolve => setTimeout(resolve, 333))
    }
    
}

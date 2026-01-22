// import { SpendableDO } from "../../contracts/SpendableDO";
import { SDOOwnerWriter } from "../../contracts/SDO_v7";
import { ByteString, Outpoint, Signer } from "scrypt-ts";
import axios from 'axios'


export async function fetchSDO(outpoint: Outpoint, wallet: Signer) {
    let response = await wallet.provider?.getTransaction(outpoint.txid)
    if ( response !== undefined ) {
        return SDOOwnerWriter.fromTx(response, Number(outpoint.outputIndex))
    } else {
        throw new Error("Txid " + outpoint.txid + " does not exist on chain")
    }
}

const decodeToString = (byteString: ByteString) => {
    return Buffer.from(byteString, 'hex').toString('utf8')
}

export function getKey(SDOstate: SDOOwnerWriter) {
    return decodeToString(SDOstate.key)
}

export function getVal(SDOstate: SDOOwnerWriter) {
    return decodeToString(SDOstate.value)
}

export function prettyString(SDOstate: SDOOwnerWriter) {
    return "-----------------------------\n" +
            "|UID:     " + SDOstate.UID.toString() + "\n" +
            // "|tableID: " + SDOstate.tableID + "\n" +
            "|Key:     " + getKey(SDOstate) + "\n" +
            "|Val:     " + getVal(SDOstate) + "\n" +
            // "|owner:   " + SDOstate.ownerPubKey + "\n" +
            // "|writer:  " + SDOstate.writerPubKey + "\n" +
            // "|txid:    " + SDOstate.utxo.txId.slice(0,4) + "......" + SDOstate.utxo.txId.slice(60) + "\n" +
            "|txid:    " + SDOstate.txId + "\n" +       // full txid
            "|outIndex:" + SDOstate.outIndex + "\n" +
            "----------------------------\n"
}


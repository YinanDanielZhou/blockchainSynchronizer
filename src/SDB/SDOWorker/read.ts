import { SpendableDO } from "../../contracts/SpendableDO";
import { ByteString, Outpoint, Signer } from "scrypt-ts";
import axios from 'axios'


export async function fetchSDO(outpoint: Outpoint, wallet: Signer) {
    let response = await wallet.provider?.getTransaction(outpoint.txid)
    if ( response !== undefined ) {
        return SpendableDO.fromTx(response, Number(outpoint.outputIndex))
    } else {
        throw new Error("Txid " + outpoint.txid + " does not exist on chain")
    }
}

export async function getRawTransactionHex(
    network = 'test',
    txHash: string
): Promise<string> {
    const options = {
        method: 'GET',
        url:
            'https://api.whatsonchain.com/v1/bsv/' +
            network +
            '/tx/' +
            txHash +
            '/hex',
    }
    let returnString = ''
    returnString = await axios
        .request(options)
        .then(function ({ data }) {
            return data
            // console.log(data);
        })
        .catch(function (error: any) {
            console.error(error)
        })
    return returnString
}

const decodeToString = (byteString: ByteString) => {
    return Buffer.from(byteString, 'hex').toString('utf8')
}

export function getKey(SDOstate: SpendableDO) {
    return decodeToString(SDOstate.key)
}

export function getVal(SDOstate: SpendableDO) {
    return decodeToString(SDOstate.val)
}

export function prettyString(SDOstate: SpendableDO) {
    return "-----------------------------\n" +
            "|UID:     " + SDOstate.UID.toString() + "\n" +
            // "|tableID: " + SDOstate.tableID + "\n" +
            "|Key:     " + getKey(SDOstate) + "\n" +
            "|Val:     " + getVal(SDOstate) + "\n" +
            // "|owner:   " + SDOstate.ownerPubKey + "\n" +
            // "|writer:  " + SDOstate.writerPubKey + "\n" +
            // "|txid:    " + SDOstate.utxo.txId.slice(0,4) + "......" + SDOstate.utxo.txId.slice(60) + "\n" +
            "|txid:    " + SDOstate.utxo.txId + "\n" +       // full txid
            "|outIndex:" + SDOstate.utxo.outputIndex + "\n" +
            "----------------------------\n"
}


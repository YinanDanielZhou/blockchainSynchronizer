import { SpendableDO } from "../../contracts/SpendableDO"
import { LLNodeSDO } from "../utiles/dataStructures"
import { prettyString } from "./read"

import fs from "fs"
import { TxOutputRef, bsv } from "scrypt-ts"
import pako from 'pako';

const MainnetPersistencePath = 'src/SDB/persistence/mainnet/storageCompressed.bin'
const TestnetPersistencePath = 'src/SDB/persistence/testnet/storageCompressed.bin'

const usingTestnet = false

export async function loadSDOsCompressed(SDO_curr_state: Map<string, LLNodeSDO>, verbose: boolean = false) {
    console.log("Loading pesisted SDO instances.....")
    let filePath : string;
    if (usingTestnet) {
        filePath = TestnetPersistencePath
    } else {
        filePath = MainnetPersistencePath
    }

    let known_block_height = -1
    let persistence_version = -1
    return fs.promises.readFile(filePath).then((compressedBuffer) => {
        const jsonArray = pako.inflate(compressedBuffer, { to: 'string' })
        if (jsonArray.length < 2) {
            console.log("No SDO was persisted in file ", filePath)
            return [persistence_version, known_block_height]
        }

        const restoredArray = (JSON.parse(jsonArray) as Object[])

        restoredArray.forEach((restoredObject : any, index) => {
            if (index == 0) {
                persistence_version = restoredObject
                return 
            }
            if (index == 1) {
                known_block_height = restoredObject
                return
            }
            const restoredTx = new bsv.Transaction(restoredObject.rawTx)
            const restoredSDO = SpendableDO.fromTx(restoredTx, restoredObject.outputIndex)
            localRegisterSDO(restoredSDO, restoredObject.block_time, SDO_curr_state, false)
            if (verbose) {
                console.log(prettyString(restoredSDO))
            }
        })
        console.log(`Persistence version ${persistence_version}`)
        console.log("Loaded ", restoredArray.length - 2, " SDO instances.")   // first 2 objects are not SDO instances
        console.log(`Resuming from block height ${known_block_height}`)
        return [persistence_version, known_block_height]
    }).catch((err) => {
        console.error(err)
        throw err
    })
}

export function persistSDOsCompressed(SDO_curr_state: Map<string, LLNodeSDO>, persistence_version: number, known_block_height: number) {
    console.log("Persisting SDO instances")
    let array : Object[] = [persistence_version, known_block_height]

    for (const [uid, llNodeSDO] of SDO_curr_state) {
        let curNode = llNodeSDO
        let tx = (curNode.this.from as TxOutputRef).tx

        const rawTx = (curNode.this.from as TxOutputRef).tx.uncheckedSerialize()
        const outputIndex = curNode.this.from?.outputIndex as number
        array.push({
            rawTx: rawTx,
            outputIndex: outputIndex,
            block_time: llNodeSDO.block_time
        })
    }
    
    const jsonArray = JSON.stringify(array)
    // console.log(jsonArray)

    let filePath
    if (usingTestnet) {
        filePath = TestnetPersistencePath
    } else {
        filePath = MainnetPersistencePath
    }
    const compressedData = pako.deflate(jsonArray);


    // Write the JSON string to the file
    fs.writeFile(filePath, compressedData, (err) => {
        if (err) {
            console.error('Error writing to file:', err);
        } else {
            console.log(`Persistence_version ${array[0]}, Last known block height is ${array[1]}.`)  
            console.log(array.length - 2, ' SDO instances has been persisted to file:', filePath)  // first 2 objects are not SDO instances
        }
    })
}

export function localRegisterSDO(SDOstate: SpendableDO, block_time:number, SDO_curr_state: Map<string, LLNodeSDO>, verbose: boolean) {
    const UID = SDOstate.UID;
    if (SDO_curr_state.has(UID)) {
        console.error("UID ", UID, " already exist. Register fail.")
        return
    }
    if (verbose) {
        console.log("Local registering a SDO: ", UID)
    }
    let llNode = {
        this: SDOstate,
        block_time: block_time,
        spent: false
    } as LLNodeSDO
    SDO_curr_state.set(UID, llNode)
}

export function localUpdateSDO(SDOstate: SpendableDO, block_time:number, SDO_curr_state: Map<string, LLNodeSDO>, prevTxId:string) {
    const UID = SDOstate.UID;
    let newNode = {
        this: SDOstate,
        block_time: block_time,
        spent: true     // set this to true to simulate BCSS (and to prevent LCSS exp from more bugs)
    } as LLNodeSDO

    // this SDO has a previous state in the blockchain so it should have one local as well
    const curNode = SDO_curr_state.get(UID)

    if (curNode == undefined) {
        console.error(`Failed to update local SDO ${SDOstate.UID} given txn ${SDOstate.utxo.txId}. This SDO is unknown to local.`)
        return
    } else {
        if (curNode.this.utxo.txId == SDOstate.utxo.txId) {
            console.log(`Local SDO ${SDOstate.UID} is already up-to-date as of txn ${SDOstate.utxo.txId}. No action.`)
        } else if (curNode.block_time > newNode.block_time) {
            console.log(`Local SDO ${SDOstate.UID} has a newer state in txn ${curNode.this.utxo.txId}. No action.`)
        } else if (curNode.this.utxo.txId !== prevTxId) {
            console.error(`Failed to update local SDO ${SDOstate.UID} given txn ${SDOstate.utxo.txId}. Local state is off-sync with BC.`)
            console.error(`Local    SDO ${SDOstate.UID} state  is from txn ${curNode.this.utxo.txId}`)
            console.error(`Incoming SDO ${SDOstate.UID}'s prev is from txn ${prevTxId}. Mismatch found.`)
        } else {
            console.log("Local updating a registered SDO: ", UID)
            curNode.next = newNode
            newNode.prev = curNode
            SDO_curr_state.set(UID, newNode)
        }
    }
}
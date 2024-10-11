import { SpendableDO } from "../../contracts/SpendableDO"
import { LLNodeSDO } from "../utiles/dataStructures"
import { prettyString } from "./read"

import fs from "fs"
import { TxOutputRef, bsv } from "scrypt-ts"
import pako from 'pako';

const MainnetPersistencePath = 'src/SDB/persistence/mainnet/storageCompressed.bin'
const MainnetPersistencePathRawTx = 'src/SDB/persistence/mainnet/rawTxCompressed.bin'
const MainnetPersistencePathMeta = 'src/SDB/persistence/mainnet/metaCompressed.bin'

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

export async function newLoadSDOsCompressed(SDO_curr_state: Map<string, LLNodeSDO>, verbose: boolean = false) {
    console.log("Loading pesisted SDO instances.....")

    const rawTxFilePath = MainnetPersistencePathRawTx
    const metaFilePath = MainnetPersistencePathMeta

    let known_block_height = -1
    let persistence_version = -1

    let rawTxMap : Map<string, string>;
    await fs.promises.readFile(rawTxFilePath).then((compressedRawTx) => {
        const jsonString = pako.inflate(compressedRawTx, { to: 'string'})
        rawTxMap = jsonToMap(jsonString)
    }).catch((err) => {
        console.error(err)
        throw err
    })

    let metaArray;
    await fs.promises.readFile(metaFilePath).then((compressedMeta) => {
        const jsonArray = pako.inflate(compressedMeta, { to: 'string' })

        if (jsonArray.length < 2) {
            console.log("No SDO was persisted in file ", metaFilePath)
            return [persistence_version, known_block_height]
        }

        metaArray = (JSON.parse(jsonArray) as Object[])

    }).catch((err) => {
        console.error(err)
        throw err
    })

    metaArray.forEach((restoredObject : any, index) => {
        if (index == 0) {
            persistence_version = restoredObject
            return 
        }
        if (index == 1) {
            known_block_height = restoredObject
            return
        }
        const SDO_txid = restoredObject.outputTxid
        const rawTx = new bsv.Transaction(rawTxMap.get(SDO_txid))
        const restoredSDO = SpendableDO.fromTx(rawTx, restoredObject.outputIndex)
        localRegisterSDO(restoredSDO, restoredObject.block_time, SDO_curr_state, false)
        if (verbose) {
            console.log(prettyString(restoredSDO))
        }
    })
    console.log(`Persistence version ${persistence_version}`)
    console.log("Loaded ", metaArray.length - 2, " SDO instances.")   // first 2 objects are not SDO instances
    console.log(`Resuming from block height ${known_block_height}`)
    return [persistence_version, known_block_height]
}


export function persistSDOsCompressed(SDO_curr_state: Map<string, LLNodeSDO>, persistence_version: number, known_block_height: number) {
    console.log("Persisting SDO instances")
    let array : Object[] = [persistence_version, known_block_height]
    let rawTxMap : Map<string, string> = new Map();

    for (const [uid, llNodeSDO] of SDO_curr_state) {
        let curNode = llNodeSDO
        let outputTx = (curNode.this.from as TxOutputRef).tx

        const rawTx = outputTx.uncheckedSerialize()
        const outputIndex = curNode.this.from?.outputIndex as number

        if (!rawTxMap.has(outputTx.id)) {
            rawTxMap.set(outputTx.id, rawTx)
        }
        array.push({
            outputTxid: outputTx.id,
            outputIndex: outputIndex,
            block_time: llNodeSDO.block_time
        })
    }
    const jsonAllRawTx = mapToJson(rawTxMap)
    const jsonArray = JSON.stringify(array);
    // console.log(jsonArray)

    const rawTxFilePath = MainnetPersistencePathRawTx
    const metaFilePath = MainnetPersistencePathMeta

    const compressedRawTx = pako.deflate(jsonAllRawTx);
    const compressedMeta = pako.deflate(jsonArray)

    // Write the JSON string to the file
    fs.writeFile(rawTxFilePath, compressedRawTx, (err) => {
        if (err) {
            console.error('Error writing rawTx to file:', err);
        } else {
            console.log(rawTxMap.size, ' raw txn has been persisted to file:', rawTxFilePath)  // first 2 objects are not SDO instances
        }
    })

    fs.writeFile(metaFilePath, compressedMeta, (err) => {
        if (err) {
            console.error('Error writing meta to file:', err);
        } else {
            console.log(`Persistence_version ${array[0]}, Last known block height is ${array[1]}.`)  
            console.log(array.length - 2, ' SDO meta has been persisted to file:', metaFilePath)  // first 2 objects are not SDO instances
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
        spent: false     // set this to true to simulate BCSS (or to prevent inconsistency when doing multi-updates on LCSS)
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

// Function to serialize a Map to JSON
function mapToJson<K, V>(map: Map<K, V>): string {
    // Convert the Map to an array of key-value pairs and stringify it
    return JSON.stringify(Array.from(map.entries()));
}

// Function to deserialize a JSON string back to a Map
function jsonToMap<K, V>(jsonStr: string): Map<string, string> {
    // Parse the JSON string to get an array of key-value pairs
    const entries: [string, string][] = JSON.parse(jsonStr);
    // Convert the array back into a Map
    return new Map<string, string>(entries);
}

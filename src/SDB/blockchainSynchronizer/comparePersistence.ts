import { LLNodeSDO } from "../utiles/dataStructures";
import { loadSDOsCompressed, localRegisterSDO } from "../SDOWorker/diskIO";
import { SpendableDO } from "../../contracts/SpendableDO";
import { prettyString } from "../SDOWorker/read";
import fs from "fs"
import pako from 'pako';
import { bsv } from "scrypt-ts";


SpendableDO.loadArtifact()

let SDO_curr_state = new Map<string, LLNodeSDO>();

let another_SDO_curr_state = new Map<string, LLNodeSDO>();


(async () => {
    let rtn = await loadSDOsCompressed(SDO_curr_state, false)
    console.log(rtn[0])
    console.log(rtn[1])


    let another = await loadAnotherSDOs(another_SDO_curr_state, false)
    console.log(another[0])
    // console.log(another[1])

    // let sdoA = SDO_curr_state.get("013b337eed")
    // console.log(sdoA?.this.utxo.txId)
    // console.log(sdoA?.block_time)



    // let sdoB = another_SDO_curr_state.get("013b337eed")
    // console.log(sdoB?.this.utxo.txId)
    // console.log(sdoB?.block_time)


    // For Each cached SDO, check if it is the most recent verion, (aka the Script has a confirmed UTxO)
    console.log("Comparing the two SDO persistences.....")

    const iteratorA = SDO_curr_state.entries()
    const iteratorB = another_SDO_curr_state.entries()
    let iterA = iteratorA.next()
    let iterB = iteratorB.next()

    let counter = 0
    while (!iterA.done) {
        if (iterA.value[1].this.UID !== iterB.value[1].this.UID) {
            console.log("mismatch UID")
            break;
        }

        if (iterA.value[1].block_time !== iterB.value[1].block_time) {
            console.log(`mismatch block_time for SDO ${iterA.value[1].this.UID}`)
            console.log(`A has ${iterA.value[1].block_time}`)
            console.log(`B has ${iterB.value[1].block_time}`)
        }

        if (iterA.value[1].this.scriptHash !== iterB.value[1].this.scriptHash) {
            console.log(`mismatch scriptHash for SDO ${iterA.value[1].this.UID}`)
            console.log(`A has ${iterA.value[1].this.scriptHash}`)
            console.log(`B has ${iterB.value[1].this.scriptHash}`)
        }

        counter += 1
        iterA = iteratorA.next()
        iterB = iteratorB.next()
    }
    console.log(`${counter} done`)
})();


async function loadAnotherSDOs(SDO_curr_state: Map<string, LLNodeSDO>, verbose: boolean = false) {
    console.log("Loading pesisted SDO instances.....")
    let filePath : string;
    filePath = 'storageCompressedTheOtherOne.bin'

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
import { JungleBusClient, ControlMessageStatusCode } from "@gorillapool/js-junglebus";
import { LLNodeSDO } from "../utiles/dataStructures";
import { loadSDOsCompressed, persistSDOsCompressed, localRegisterSDO, localUpdateSDO } from "../SDOWorker/diskIO";
import { SpendableDO } from "../../contracts/SpendableDO";
import { TxOutputRef, bsv } from "scrypt-ts";
import { prettyString } from "../SDOWorker/read";
import express, { Request, Response } from "express";
import { integrityCheck } from "../SDOWorker/integrityCheck";


SpendableDO.loadArtifact()

let SDO_curr_state = new Map<string, LLNodeSDO>();
let persistence_version: number;
let known_block_height: number;
let processed_update_txn_count = 0;

const client = new JungleBusClient("junglebus.gorillapool.io", {
    protocol: "protobuf",
    useSSL: true,
    onConnected(ctx) {
        console.log("CONNECTED", ctx);
    },
    onConnecting(ctx) {
        console.log("CONNECTING", ctx);
    },
    async onDisconnected(ctx) {
        console.log("DISCONNECTED", ctx);
    },
    onError(ctx) {
        console.error(ctx);
    },
});

const onPublish = function(message) {
    console.log("IN-BLOCK TRANSACTION", message.id);
    // processIncomingTransactionMsg(message)
};

const onStatus = function(message) {
    if (message.statusCode === ControlMessageStatusCode.BLOCK_DONE) {
      console.log("BLOCK DONE", message.block);
      console.log("Processed " + processed_update_txn_count + " update txns from this block")
      known_block_height = message.block
      processed_update_txn_count = 0
    } else if (message.statusCode === ControlMessageStatusCode.WAITING) {
      console.log("WAITING FOR NEW BLOCK...", new Date().toLocaleString());
      if (message.statusCode !== 100) {
        console.log(message)
      }
    } else if (message.statusCode === ControlMessageStatusCode.REORG) {
      console.log("REORG TRIGGERED", message);
    } else if (message.statusCode === ControlMessageStatusCode.ERROR) {
      console.error(message);
    }
};
const onError = function(err) {
    console.error(err);
};
const onMempool = function(message) {
    console.log("MEMPOOL TRANSACTION", message.id);
    processIncomingTransactionMsg(message)
};

function processIncomingTransactionMsg(message) {
    const txn = new bsv.Transaction(message.transaction)
    if (txn.outputs.length < 2) {
        console.log("Txn structure does not match a SDB transaction.")
        return
    }

    if (txn.inputs.length == 1 && txn.outputs.length == 2) {
        // this is a SDO deployment txn
        try {
            const sdo = SpendableDO.fromTx(txn, 0)
            sdo.markAsGenesis()
            localRegisterSDO(sdo, message.block_time, SDO_curr_state, true);
        } catch (error) {
            console.log("Incoming txn looks like a sdo deployment, but registering fail with Error below.")
            console.log(error)
        }
    }

    if (txn.inputs.length == txn.outputs.length) {
        // this is a SDO state update txn
        for (let outIndex = 0; outIndex < txn.outputs.length - 1; outIndex++) {   // the last outIndex is the payment so is ignored
            const sdo = SpendableDO.fromTx(txn, outIndex)
            const prevTxId = txn.inputs[outIndex].prevTxId.toString('hex')    // get the previous sdo state's transaction id
            localUpdateSDO(sdo, message.block_time, SDO_curr_state, prevTxId);
        }
        processed_update_txn_count += 1
    }
}

function startRESTfulServer() {
    const app = express();
    const PORT = 3000;

    // Middleware to parse JSON request bodies
    app.use(express.json());

    // GET /users - Get all users
    app.get('/sdo/:UID', (req: Request, res: Response) => {
        const { UID } = req.params;
        const llNode = SDO_curr_state.get(UID)
        if (llNode) {
            if (!llNode.spent) {
                llNode.spent = true
                res.json(llNode.this.utxo)
            } else {
                res.status(409).json({ message: `SDO ${UID} has being locked.`})
            }
        } else {
            res.status(404).json({ message: `SDO ${UID} does not exist.`})
        }
    });

    app.get('/sdoRO/:UID', (req: Request, res: Response) => {
        const { UID } = req.params;
        const llNode = SDO_curr_state.get(UID)
        if (llNode) {
            res.json({
                UID: UID,
                key: llNode.this.key, 
                val: llNode.this.val,
                id: llNode.this.utxo.txId,
                outIndex: llNode.this.utxo.outputIndex,
                owner: llNode.this.ownerPubKey,
                writer: llNode.this.writerPubKey
            })
        } else {
            res.status(404).json({ message: `SDO ${UID} does not exist.`})
        }
    });

    app.get('/allsdo', (req: Request, res: Response) => {
        const arr = Array.from(SDO_curr_state.keys())
        res.json(arr)
    });

    // Start the server
    return app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

// 836566   // SDB address finished setting up, 64 payment utxos set up
// 836573   // first few SDOs
// 1000000
// let startBlockHeight = 842275;

(async () => {

    let rtn = await loadSDOsCompressed(SDO_curr_state, false)
    persistence_version = rtn[0]
    known_block_height = rtn[1]

    await client.Subscribe("1e5d27bb7ea6e4ef330bf6d9bb17a42430ffe8fdfff26cc00172e2a9089fcfc8", known_block_height + 1, onPublish, onStatus, onError, onMempool);
    await client.Subscribe("b0f69bb599f193a42d8cdf360549e4665c551150acaba9724be0c81670e3bd00", known_block_height + 1, onPublish, () => {}, onError, onMempool); // only one subscription need to react to onStatus
    await client.Subscribe("7c96a193f91a9d3ad7f0671169d399a80d711d3d900f4e3d52622b3c5280ef25", known_block_height + 1, onPublish, () => {}, onError, onMempool); // only one subscription need to react to onStatus
    await client.Subscribe("0a8b721260a03b05447d76c571c297b872c2d5cb09ba2955b1a91da6b247469e", known_block_height + 1, onPublish, () => {}, onError, onMempool); // only one subscription need to react to onStatus
    
    const APIserver = startRESTfulServer();

    process.on('SIGINT', () => {
        console.log("process on SIGINT.")
        APIserver.close(() => {
            console.log("API server is shut down.")
        })
        client.Disconnect()
        persistSDOsCompressed(SDO_curr_state, persistence_version + 1, known_block_height);
    });
})();

// (async () => {
//     let rtn = await loadSDOsCompressed(SDO_curr_state, false)
//     persistence_version = rtn[0]
//     known_block_height = rtn[1]

//     await integrityCheck(SDO_curr_state)

//     persistSDOsCompressed(SDO_curr_state, persistence_version + 1, known_block_height);
// })();
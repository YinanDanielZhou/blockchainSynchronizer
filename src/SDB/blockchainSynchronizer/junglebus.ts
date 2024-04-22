import { JungleBusClient, ControlMessageStatusCode } from "@gorillapool/js-junglebus";
import { LLNodeSDO } from "../utiles/dataStructures";
import { loadSDOsCompressed, persistSDOsCompressed, localRegisterSDO, localUpdateSDO } from "../SDOWorker/diskIO";
import { SpendableDO } from "../../contracts/SpendableDO";
import { TxOutputRef, bsv } from "scrypt-ts";
import { prettyString } from "../SDOWorker/read";
import express, { Request, Response } from "express";
import session from "express-session";


SpendableDO.loadArtifact()

let SDO_curr_state = new Map<string, LLNodeSDO>();
let known_block_height: number;

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
      known_block_height = message.block
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
        const sdo = SpendableDO.fromTx(txn, 0)
        sdo.markAsGenesis()
        localRegisterSDO(sdo, message.block_time, SDO_curr_state, true);
    }

    if (txn.inputs.length == txn.outputs.length) {
        // this is a SDO state update txn
        for (let outIndex = 0; outIndex < txn.outputs.length - 1; outIndex++) {   // the last outIndex is the payment so is ignored
            const sdo = SpendableDO.fromTx(txn, outIndex)
            const prevTxId = txn.inputs[outIndex].prevTxId.toString('hex')    // get the previous sdo state's transaction id
            localUpdateSDO(sdo, message.block_time, SDO_curr_state, prevTxId);
        }
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
let startBlockHeight = 837891;

(async () => {

    known_block_height = await loadSDOsCompressed(SDO_curr_state, false)
    await client.Subscribe("8e91d8e710de1323ef1adf31f335ef9f921f9ab1e95ce1ab7c64a9d4163415d4", known_block_height + 1, onPublish, onStatus, onError, onMempool);
    await client.Subscribe("0477836b086e0628a160eb45742059fc853601b73dde8d596df5916deab87e28", known_block_height + 1, onPublish, () => {}, onError, onMempool); // only one subscription need to react to onStatus
    
    const APIserver = startRESTfulServer();

    process.on('SIGINT', () => {
        APIserver.close(() => {
            console.log("API server is shut down.")
        })
        client.Disconnect()
        persistSDOsCompressed(SDO_curr_state, known_block_height);
    });
})();



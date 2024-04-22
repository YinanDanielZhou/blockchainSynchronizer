import WebSocket from 'ws';
import { PubKey, TestWallet, bsv, toByteString } from "scrypt-ts"

import { LLNodeSDO } from '../utiles/dataStructures';

import { SpendableDO } from "../../contracts/SpendableDO";
import { testnetAddrA } from '../utiles/privateKey';

SpendableDO.loadArtifact()

let SDO_curr_state = new Map<string, LLNodeSDO>()

let ws : WebSocket | undefined;
let clientID;
let reconnect = true;
let numFailures = 0;
let SDBAddress = testnetAddrA;

(async function main() {
    startWebsocket()
})()

function startWebsocket() {
    // const chainStatsURL = "wss://socket-testnet.whatsonchain.com/websocket?channels=woc:chainStats"
    const mempoolTxURL = "wss://socket-testnet.whatsonchain.com/websocket?channels=woc:mempoolTx"
    ws = new WebSocket(mempoolTxURL)

    // Event: WebSocket connection established
    ws.on('open', function open() { 
        console.log('Connected to WebSocket server');
        ws.send(JSON.stringify({}));
    });

    // Event: WebSocket message received
    ws.on('message', function incoming(msg) {
        if (msg.length == 0) {
            console.log("--> ping");
            return 
        }

        // Convert received bytes to a string
        // const strData = data.toString('hex');
        try {
            // Parse the string as JSON
            const jsonData = JSON.parse(msg.toString('utf8'));
            processData(jsonData)
        } catch (error) {
            console.error('Error parsing JSON:', error);
        }
    });

    // Event: WebSocket connection closed
    ws.on('close', function close() {
        console.log('Disconnected from WebSocket server');
    });
}


function processData(jsonData) {
    const pushType = jsonData.type || 0;
    switch (pushType) {
        case 0:
            console.log("new data from a channel " + jsonData.channel + ": ");
            if (jsonData.data.data.size > 17000 
                && jsonData.data.data.vincount > 1
                && jsonData.data.data.vincount === jsonData.data.data.voutcount
                && jsonData.data.data.vout[jsonData.data.data.vout.length - 1].scriptPubKey.addresses[0] === SDBAddress.toString()
                ) {
                    console.log(jsonData.data.data.txid)
            } else {
                console.log("Not a SDB txn. Ignore.")
            }
        
            break;
        case 6:
            clientID = jsonData.data.client;
            let subscriptions :string[] = [];
            const subs = jsonData.data.subs;
            if (subs) {
                for (const m in subs) {
                    if (subs.hasOwnProperty(m)) {
                        subscriptions.push(m);
                    }
                }
            }
            console.log("connected with client ID " + clientID + " and subscriptions: " + JSON.stringify(subscriptions));
            break;
        case 7:
            clientID = null;
            if (!jsonData.data.reconnect) {
                reconnect = false;
                ws.close();
                console.log("disconnected from a server, won't reconnect");
            } else {
                console.log("disconnected from a server, will reconnect");
            }
            break;
        case 3:
            console.log("unsubscribed from a channel " + jsonData.channel);
            break;
        case 5:
            console.log("subscribed to a channel " + jsonData.channel);
            break;
        default:
            console.log("unsupported push type " + jsonData.type);
    }
}


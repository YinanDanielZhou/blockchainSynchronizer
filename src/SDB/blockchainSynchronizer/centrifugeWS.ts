import { JungleBusClient, ControlMessageStatusCode } from "@gorillapool/js-junglebus";
import { LLNodeSDO } from "../utiles/dataStructures";
import { loadSDOsCompressed, persistSDOsCompressed, localRegisterSDO, localUpdateSDO } from "../SDOWorker/diskIO";
import { SpendableDO } from "../../contracts/SpendableDO";
import { TxOutputRef, bsv } from "scrypt-ts";
import { prettyString } from "../SDOWorker/read";
import express, { Request, Response } from "express";
import { integrityCheck, makeupMissingTxn } from "../SDOWorker/integrityCheck";
import { Centrifuge } from 'centrifuge'
import WebSocket from 'ws';


SpendableDO.loadArtifact()

let SDO_curr_state = new Map<string, LLNodeSDO>();
let persistence_version: number;
let known_block_height: number;
let processed_update_txn_count = 0;


let centrifuge = new Centrifuge('wss://socket.whatsonchain.com/mempool', {
    websocket: WebSocket
})

// wss://socket.whatsonchain.com/mempool?filter=<filter1,filter2,...>

centrifuge.on('message', function(message) {
    console.log('message: '+   JSON.stringify(message.data, null, 2))
});

centrifuge.on('publication', function(message) {
    console.log('publication: '+   JSON.stringify(message.data, null, 2))
})

centrifuge.on('disconnected', function(ctx){
    console.log('Disconnected: ' + ctx.reason + ctx.code);
});

centrifuge.on('connected', function(ctx){
    console.log('Connected with client ID ' + ctx.client + ' over ' + ctx.transport );
});

centrifuge.on('connecting', function(ctx) {
    console.log('connecting')
});

centrifuge.on('error', function(ctx) {
    console.log(ctx);
});


// Trigger actual connection establishement.
centrifuge.connect();

const sub = centrifuge.newSubscription('fuck you')

// sub.on('publication', function(ctx) {
//     // handle new Publication data coming from channel "news".
//     console.log(ctx.data);
// });

sub.subscribe();


process.on('SIGINT', () => {
    console.log("process on SIGINT.")



    centrifuge.disconnect()
    // persistSDOsCompressed(SDO_curr_state, persistence_version + 1, known_block_height);
});
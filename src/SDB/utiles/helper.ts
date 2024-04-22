import { DummyProvider, DefaultProvider, TestWallet, bsv, Signer, Scrypt, TaalProvider, ScryptProvider } from 'scrypt-ts'
import { mainnetPriKeyA, testnetPriKeyA, testnetPriKeyB } from './privateKey'

import * as dotenv from 'dotenv'

// Load the .env file
dotenv.config()

export const usingTestnet = false    // false means using mainnet

let scryptWallet
if (usingTestnet) {
    Scrypt.init({
        apiKey: 'testnet_3Wusfe4YCtdLcvLcNGO7dQImEOPe5MOAxCN8IQeL3Skjgg1PQ',
        network: bsv.Networks.testnet,
    })
    scryptWallet = new TestWallet(
        testnetPriKeyA,
        new ScryptProvider()
    )
} else {
    Scrypt.init({
        apiKey: 'mainnet_2sHWSO6Ja79D0DlAc3uPtSvgovaG9jcZ1yXNlJGmfC9yBUBUY',
        network: bsv.Networks.mainnet,
    })
    scryptWallet = new TestWallet(
        mainnetPriKeyA,
        new ScryptProvider()
    )
}

export const sCryptWallet = scryptWallet

export const scryptWalletTestnet = new TestWallet(
    testnetPriKeyA,
    new ScryptProvider()
)

export const scryptWalletMainnet = new TestWallet(
    mainnetPriKeyA,
    new ScryptProvider()
)

// export const wallets: Record<string, TestWallet> = {
//     testnetA: new TestWallet(
//         testnetPriKeyA,
//         new DefaultProvider({
//             taal: "testnet_b0b5af5a752647888692cbf39e9dce76",
//             scrypt: {
//                 apiKey: "testnet_3Wusfe4YCtdLcvLcNGO7dQImEOPe5MOAxCN8IQeL3Skjgg1PQ"
//             },
//             network: bsv.Networks.testnet,
//         })
//     ),
//     testnetB: new TestWallet(
//         testnetPriKeyB,
//         new DefaultProvider({
//             taal: "testnet_b0b5af5a752647888692cbf39e9dce76",
//             scrypt: {
//                 apiKey: "testnet_3Wusfe4YCtdLcvLcNGO7dQImEOPe5MOAxCN8IQeL3Skjgg1PQ"
//             },
//             network: bsv.Networks.testnet,
//         })
//     ),
//     mainnetA: new TestWallet(
//         mainnetPriKeyA,
//         new DefaultProvider({
//             network: bsv.Networks.mainnet,
//         })
//     ),
//     local: new TestWallet(testnetPriKeyA, new DummyProvider()),
// }

// export function getDefaultSigner(
//     privateKey?: bsv.PrivateKey | bsv.PrivateKey[]
// ): TestWallet {
//     const network = process.env.NETWORK || 'local'

//     const wallet = wallets[network]

//     if (privateKey) {
//         wallet.addPrivateKey(privateKey)
//     }

//     return wallet
// }

// export function getNewSigner(privateKey: bsv.PrivateKey): TestWallet {
//     const network = process.env.NETWORK || 'local'

//     const wallets: Record<string, TestWallet> = {
//         testnet: new TestWallet(
//             privateKey,
//             new DefaultProvider({
//                 network: bsv.Networks.testnet,
//             })
//         ),
//         local: new TestWallet(privateKey, new DummyProvider()),
//     }

//     const wallet = wallets[network]

//     return wallet
// }

export const sleep = async (seconds: number) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({})
        }, seconds * 1000)
    })
}

// export function randomPrivateKey() {
//     const privateKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
//     const publicKey = bsv.PublicKey.fromPrivateKey(privateKey)
//     const address = publicKey.toAddress()
//     return [privateKey, publicKey, address] as const
// }

// export function getRandomInt(min: number, max: number) {
//     min = Math.ceil(min)
//     max = Math.floor(max)
//     return Math.floor(Math.random() * (max - min) + min) // The maximum is exclusive and the minimum is inclusive
// }
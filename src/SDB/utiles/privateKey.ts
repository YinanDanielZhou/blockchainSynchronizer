import { bsv } from 'scrypt-ts'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

const dotenvConfigPath = '.env'
dotenv.config({ path: dotenvConfigPath })

export const testnetPriKeyA = bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY as string)
export const testnetPubKeyA = bsv.PublicKey.fromPrivateKey(testnetPriKeyA)
export const testnetAddrA   = testnetPubKeyA.toAddress()

export const testnetPriKeyB = bsv.PrivateKey.fromWIF(process.env.PRIVATE_KEY_SECOND as string)
export const testnetPubKeyB = bsv.PublicKey.fromPrivateKey(testnetPriKeyB)
export const testnetAddrB   = testnetPubKeyB.toAddress()

export const mainnetPriKeyA = bsv.PrivateKey.fromWIF(process.env.MAINNET_PRIVATE_KEY as string)
export const mainnetPubKeyA = bsv.PublicKey.fromPrivateKey(mainnetPriKeyA)
export const mainnetAddrA   = mainnetPubKeyA.toAddress()


// export function genPrivKey(network: bsv.Networks.Network): bsv.PrivateKey {
//     dotenv.config({
//         path: '.env',
//     })

//     const privKeyStr = process.env.PRIVATE_KEY
//     let privKey: bsv.PrivateKey
//     if (privKeyStr) {
//         privKey = bsv.PrivateKey.fromWIF(privKeyStr as string)
//         console.log(`Private key already present ...`)
//     } else {
//         privKey = bsv.PrivateKey.fromRandom(network)
//         console.log(`Private key generated and saved in "${'.env'}"`)
//         console.log(`Publickey: ${privKey.publicKey}`)
//         console.log(`Address: ${privKey.toAddress()}`)
//         fs.writeFileSync('.env', `PRIVATE_KEY="${privKey}"`)
//     }

//     const fundMessage = `You can fund its address '${privKey.toAddress()}' from the sCrypt faucet https://scrypt.io/faucet`

//     console.log(fundMessage)

//     return privKey
// }


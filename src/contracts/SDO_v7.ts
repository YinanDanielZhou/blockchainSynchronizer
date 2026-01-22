import * as fs from "fs"
import cbor from 'cbor';

import { getPushDataPrefix, getVarIntPrefix, numberToHex, pushDataHexMinEncoding, reverseEndianness, to4ByteHexLittleEndian, to8ByteHexLittleEndian } from '../SDB/utils/otherHelper'
import { bsv, Sig, toHex } from "scrypt-ts";


export class SDOOwnerWriter {

    static ADDRLENINBYTES = 20

    static lockingScriptTemplate = fs.readFileSync('./src/contracts/sdo_v7.txt').toString()

    static ownerAddrPos = SDOOwnerWriter.lockingScriptTemplate.indexOf("00".repeat(20))
    static writerAddrPos = SDOOwnerWriter.lockingScriptTemplate.indexOf("00".repeat(20), SDOOwnerWriter.ownerAddrPos + 40)
    static fixedScriptLength = this.lockingScriptTemplate.length

    txId: string;
    outIndex: number;
    satoshis: number;
    ownerAddress: bsv.Address;
    writerAddress: bsv.Address;
    UID: string;
    key: string;
    value: string;

    constructor(lockingScript: string, txId: string, outIndex: number, satoshis: number) {
        try {
            const initializationResult = SDOOwnerWriter.parseLockingScript(lockingScript)
        
            this.txId = txId
            this.outIndex = outIndex
            this.satoshis = satoshis
            this.ownerAddress = initializationResult.ownerAddress
            this.writerAddress = initializationResult.writerAddress
            this.UID = initializationResult.UID
            this.key = initializationResult.key
            this.value = initializationResult.value
            // console.log("SDO " + this.UID + " initialized")
        } catch (error) {
            console.log(error)
            throw new Error("Initialization failed: Invalid locking script")
        }
    }

    static fromTx(tx: bsv.Transaction, outIndex: number) {
        const lockingScript = tx.outputs[outIndex].script.toHex()
        const txId = tx.id
        const satoshis = tx.outputs[outIndex].satoshis
        return new SDOOwnerWriter(lockingScript, txId, outIndex, satoshis)
    }

    static cborEncodeText(text: string) {
        return cbor.encode({text}).toString('hex')
    }

    static cborDecodeText(encodedText: string) {
        const textBuffer = Buffer.from(encodedText, 'hex')
        const decodedData = cbor.decode(textBuffer)
        return decodedData.text
    }

    static getAddressHex(address: bsv.Address) {
        return address.hashBuffer.toString('hex')
    }

    static getInitialLockingScript(ownerAddress: bsv.Address, writerAddress: bsv.Address, UID: string, key: string, value: string) {
        const valueHex = SDOOwnerWriter.cborEncodeText(value)
        const UIDHex = SDOOwnerWriter.cborEncodeText(UID)
        const keyHex = SDOOwnerWriter.cborEncodeText(key)

        const lockingScript = 
            bsv.Script.fromASM("OP_0 OP_IF").toHex() +
            pushDataHexMinEncoding(valueHex) +
            bsv.Script.fromASM("OP_ENDIF OP_CODESEPARATOR OP_0 OP_IF").toHex() +
            pushDataHexMinEncoding(UIDHex) +
            pushDataHexMinEncoding(keyHex) +
            bsv.Script.fromASM("OP_ENDIF").toHex() +
            SDOOwnerWriter.lockingScriptTemplate.substring(0, SDOOwnerWriter.ownerAddrPos) + 
            SDOOwnerWriter.getAddressHex(ownerAddress) + 
            SDOOwnerWriter.lockingScriptTemplate.substring(SDOOwnerWriter.ownerAddrPos + SDOOwnerWriter.ADDRLENINBYTES*2, SDOOwnerWriter.writerAddrPos) + 
            SDOOwnerWriter.getAddressHex(writerAddress) + 
            SDOOwnerWriter.lockingScriptTemplate.substring(SDOOwnerWriter.writerAddrPos + SDOOwnerWriter.ADDRLENINBYTES*2)
        return lockingScript
    }

    static parseLockingScript(lockingScript: string) {
        // Get the template to understand the structure
        const template = SDOOwnerWriter.lockingScriptTemplate

        const varPartLength = lockingScript.length - template.length
        const varPart = bsv.Script.fromHex(lockingScript.substring(0, varPartLength))
        const fixedLogicPart = lockingScript.substring(varPartLength)

        const valueHex = varPart.chunks[2].buf.toString('hex')
        const UIDHex = varPart.chunks[7].buf.toString('hex')
        const keyHex = varPart.chunks[8].buf.toString('hex')

        // parse the fixed logic part
        const beforeOwner = fixedLogicPart.substring(0, SDOOwnerWriter.ownerAddrPos)
        let expected = template.substring(0, SDOOwnerWriter.ownerAddrPos)
        if (beforeOwner !== expected) {
            throw new Error("LockingScript does not match template before nextWriter placeholder")
        }

        const ownerAddressHex = fixedLogicPart.substring(SDOOwnerWriter.ownerAddrPos, SDOOwnerWriter.ownerAddrPos + SDOOwnerWriter.ADDRLENINBYTES*2)

        const middle = fixedLogicPart.substring(SDOOwnerWriter.ownerAddrPos + SDOOwnerWriter.ADDRLENINBYTES*2, SDOOwnerWriter.writerAddrPos)
        expected = template.substring(SDOOwnerWriter.ownerAddrPos + SDOOwnerWriter.ADDRLENINBYTES*2, SDOOwnerWriter.writerAddrPos)
        if (middle !== expected) {
            throw new Error("LockingScript does not match template between nextWriter and masterCopy placeholders")
        }

        const writerAddressHex = fixedLogicPart.substring(SDOOwnerWriter.writerAddrPos, SDOOwnerWriter.writerAddrPos + SDOOwnerWriter.ADDRLENINBYTES*2)


        const afterMasterCopy = fixedLogicPart.substring(SDOOwnerWriter.writerAddrPos + SDOOwnerWriter.ADDRLENINBYTES*2)
        expected = template.substring(SDOOwnerWriter.writerAddrPos + SDOOwnerWriter.ADDRLENINBYTES*2)
        if (afterMasterCopy !== expected) {
            throw new Error("LockingScript does not match template after masterCopy placeholder")
        }


        const versionByte = "00"  // mainnet
        const ownerAddress = bsv.Address.fromHex(versionByte + ownerAddressHex, bsv.Networks.mainnet)
        const writerAddress = bsv.Address.fromHex(versionByte + writerAddressHex, bsv.Networks.mainnet)

        return {
            ownerAddress,
            writerAddress,
            value: SDOOwnerWriter.cborDecodeText(valueHex),
            UID: SDOOwnerWriter.cborDecodeText(UIDHex),
            key: SDOOwnerWriter.cborDecodeText(keyHex)
        }
    }

    public getLockingScript() {
        return SDOOwnerWriter.getInitialLockingScript(this.ownerAddress, this.writerAddress, this.UID, this.key, this.value)
    }

    public ownerDelete(privateKey: bsv.PrivateKey, publicKey: bsv.PublicKey) {

        const prevTxId = this.txId
        const prevOutLockingSubScript = bsv.Script.fromHex(this.getLockingScript()).subScript(0).toHex()   // only get the subscript after OP_CODESEPARATOR
        const prevOutSatoshis = this.satoshis


        const mockTxForSig = new bsv.Transaction()
        mockTxForSig.addInput(
            new bsv.Transaction.Input({
                prevTxId: prevTxId,
                outputIndex: 0,
                script: bsv.Script.empty()
            })
            , bsv.Script.fromASM(""), 1
        )

        const sighashType = bsv.crypto.Signature.ANYONECANPAY_NONE
        const sig = Sig(toHex(bsv.Transaction.Sighash.sign(
            mockTxForSig, privateKey, sighashType, 
            0, bsv.Script.fromHex(prevOutLockingSubScript), 
            new bsv.crypto.BN(prevOutSatoshis)).toTxFormat()))


        const inputScriptSig = bsv.Script.fromHex(
            pushDataHexMinEncoding(sig) +
            pushDataHexMinEncoding(publicKey.toString()) +
            "51"   // op_true for owner operations
        )

        return inputScriptSig
    }

    public getWriterUpdateScriptPair(newValueString: string, prevOutTx: bsv.Transaction, prevOutIndex: number, privateKey: bsv.PrivateKey, publicKey: bsv.PublicKey) {

        const newLockingScript = SDOOwnerWriter.getInitialLockingScript(this.ownerAddress, this.writerAddress, this.UID, this.key, newValueString)
        const output = new bsv.Transaction.Output({
            script: bsv.Script.fromHex(newLockingScript),
            satoshis: 1,
        })

        const outputSerialized = to8ByteHexLittleEndian(output.satoshis) 
                                + getVarIntPrefix(output.script.toHex()) 
                                + output.script.toHex()
        const outputHash = bsv.crypto.Hash.sha256sha256(Buffer.from(outputSerialized, 'hex')).toString('hex')

        const prevTxId = prevOutTx.id
        const prevOutLockingSubScript = prevOutTx.outputs[prevOutIndex].script.subScript(0).toHex()   // only get the subscript after OP_CODESEPARATOR
        const prevOutSatoshis = prevOutTx.outputs[prevOutIndex].satoshis

        const pre_nSequance = 
            "01000000"   // version
            + "0000000000000000000000000000000000000000000000000000000000000000"  // hash inputs outpoints
            + "0000000000000000000000000000000000000000000000000000000000000000"  // hash inputs nSequence
            + reverseEndianness(prevTxId)  // prev tx id little endian
            + to4ByteHexLittleEndian(prevOutIndex)  // prev tx's output index to be spent
            + getVarIntPrefix(prevOutLockingSubScript)
            + prevOutLockingSubScript
            + to8ByteHexLittleEndian(prevOutSatoshis)  // prev tx's output value

        const post_nSequance = 
            outputHash
            + "00000000"  // nLocktime
            + "c3000000"  // sigFlag

        const {inputScriptSigSerialTxPart, nSequence} = this.mineScriptSigSerialTxPart(pre_nSequance, post_nSequance)

        const mockTxForSig = new bsv.Transaction()
        mockTxForSig.addInput(
            new bsv.Transaction.Input({
                prevTxId: prevTxId,
                outputIndex: 0,
                script: bsv.Script.empty(),
                satoshis: 1,
                sequenceNumber: nSequence
            }),
            output.script,
            output.satoshis
        ).addOutput(output)

        const sighashType = bsv.crypto.Signature.ANYONECANPAY_SINGLE
        const sig = Sig(toHex(bsv.Transaction.Sighash.sign(
            mockTxForSig, privateKey, sighashType, 
            0, bsv.Script.fromHex(prevOutLockingSubScript), 
            new bsv.crypto.BN(prevOutSatoshis)).toTxFormat()))

        const inputScriptSig = bsv.Script.fromHex(
            pushDataHexMinEncoding(SDOOwnerWriter.cborEncodeText(newValueString)) +
            getPushDataPrefix(inputScriptSigSerialTxPart) + inputScriptSigSerialTxPart +
            getPushDataPrefix(sig) + sig +
            getPushDataPrefix(publicKey.toString()) + publicKey.toString() +
            "00"    // op_false for writer's update
        )

        return {
            unlockingScript: inputScriptSig,
            lockingScript: newLockingScript,
            nSequence: nSequence
        }
    }

    private mineScriptSigSerialTxPart(pre_nSequance: string, post_nSequance: string) {
        console.log("Mining nSequence...")
        let nSequence = 0
        let inputScriptSigSerialTxPart = ""
        while (nSequence < 0xffffffff) {
            let nSequenceHex = to4ByteHexLittleEndian(nSequence)
            inputScriptSigSerialTxPart = pre_nSequance + nSequenceHex + post_nSequance       
            if (this.scriptSigHashWorks(inputScriptSigSerialTxPart)) {
                console.log("Found nSequence: " + nSequenceHex)
                break
            }
            nSequence++
        }
        return {inputScriptSigSerialTxPart, nSequence}
    }

    private scriptSigHashWorks (inputScriptSigSerialTxPart: string) {
        const sha256Hash = bsv.crypto.Hash.sha256sha256(Buffer.from(inputScriptSigSerialTxPart, 'hex'))        
        // hash(SigHash preimage) mod 4 == 1 if the last char in hex string is 1, 3, 5, 7, 9, b, d
        return ["1", "3", "5", "7", "9", "b", "d"].includes(sha256Hash.toString('hex').charAt(63))
    }

}


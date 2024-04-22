import {
    method,
    prop,
    SmartContract,
    hash256,
    assert,
    PubKey,
    Sig,
    ByteString,
    SigHash,
    UTXO,
    bsv
} from 'scrypt-ts'

export class SpendableDO extends SmartContract {
    // Stateful property to store counters value.
    @prop()
    readonly tableID: bigint
    @prop()
    readonly UID: ByteString
    @prop()
    readonly ownerPubKey: PubKey

    @prop(true)
    key: ByteString
    @prop(true)
    val: ByteString
    @prop(true)
    writerPubKey: PubKey

    constructor(
        tableID: bigint,
        key: ByteString,
        val: ByteString,
        ownerPubKey: PubKey,
        UID: ByteString
    ) {
        super(...arguments)
        this.tableID = tableID
        this.key = key
        this.val = val
        this.ownerPubKey = ownerPubKey
        this.writerPubKey = ownerPubKey
        this.UID = UID
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public updateKeyVal(
        newKey: ByteString,
        newVal: ByteString,
        isOwner: boolean,
        callerSig: Sig
    ) {
        if (isOwner) {
            assert(this.checkSig(callerSig, this.ownerPubKey), "Owner sig wrong")
            this.key = newKey
            
        } else {
            assert(this.key == newKey, "Denied")
            assert(this.checkSig(callerSig, this.writerPubKey), "Writer sig wrong")
        }
        this.val = newVal

        // Output containing the latest state.
        const requiredOutput: ByteString = this.buildStateOutput(this.ctx.utxo.value)
        // this.debug.diffOutputs(requiredOutput)
        assert(this.ctx.hashOutputs == hash256(requiredOutput))
    }

    @method(SigHash.ANYONECANPAY_SINGLE)
    public nameWriter(writerPubkey: PubKey, ownerSig: Sig) {
        assert(
            this.checkSig(ownerSig, this.ownerPubKey),
            "owner's signature check failed"
        )
        this.writerPubKey = writerPubkey

        // Output containing the latest state.
        const requiredOutput: ByteString = this.buildStateOutput(this.ctx.utxo.value)
        // Verify current tx has this single output (and change output).
        this.debug.diffOutputs(requiredOutput)
        assert(this.ctx.hashOutputs == hash256(requiredOutput))
    }

    // @method(SigHash.ANYONECANPAY_SINGLE)
    // public updateTableID(newTableID: bigint, ownerSig: Sig) {
    //     assert(
    //         this.checkSig(ownerSig, this.ownerPubKey),
    //         "owner's signature check failed"
    //     )
    //     // update table ID
    //     this.tableID = newTableID

    //     // Output containing the latest state.
    //     const requiredOutput: ByteString = this.buildStateOutput(this.ctx.utxo.value)
    //     // Verify current tx has this single output (and change output).
    //     this.debug.diffOutputs(requiredOutput)
    //     assert(this.ctx.hashOutputs == hash256(requiredOutput))
    // }

    // @method(SigHash.ANYONECANPAY_SINGLE)
    // public transferOwnership(newOwnerPubkey: PubKey, ownerSig: Sig) {
    //     assert(
    //         this.checkSig(ownerSig, this.ownerPubKey),
    //         "owner's signature check failed"
    //     )
    //     this.ownerPubKey = newOwnerPubkey

    //     // Output containing the latest state.
    //     const requiredOutput: ByteString = this.buildStateOutput(this.ctx.utxo.value)
    //     // Verify current tx has this single output (and change output).
    //     this.debug.diffOutputs(requiredOutput)
    //     assert(this.ctx.hashOutputs == hash256(requiredOutput))
    // }
}

// import { SpendableDO } from "../../contracts/SpendableDO";
import { SDOOwnerWriter } from "../../contracts/SDO_v7";

export interface LLNodeSDO {
    this: SDOOwnerWriter,
    prev?: LLNodeSDO,
    next?: LLNodeSDO,
    block_time: number  // a timestamp given to a txn when it is first heard by a peer node
    spent: boolean,
}
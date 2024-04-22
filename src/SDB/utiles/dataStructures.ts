import { SpendableDO } from "../../contracts/SpendableDO";

export interface LLNodeSDO {
    this: SpendableDO,
    prev?: LLNodeSDO,
    next?: LLNodeSDO,
    block_time: number  // a timestamp given to a txn when it is first heard by a peer node
    spent: boolean,
}
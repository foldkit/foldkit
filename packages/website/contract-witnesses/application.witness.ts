import type { ApplicationContract as Contract } from "../src/block.contract"
import type { AssembledApplication } from "../src/block"
export declare const Actual: AssembledApplication
type Assert<T extends true> = T
type IsNever<T> = [T] extends [never] ? true : false
type Same<A,B> = [A,B] extends [B,A] ? true : false
type IsAny<T> = 0 extends 1 & T ? true : false
export type NotAny = Assert<Same<IsAny<typeof Actual>,false>>
export type ContractNotAny = Assert<Same<IsAny<Contract>,false>>
export type ContractNotNever = Assert<Same<IsNever<Contract>,false>>
export type NotNever = Assert<Same<IsNever<typeof Actual>,false>>
export type ToContract = Assert<typeof Actual extends Contract ? true : false>
export type FromContract = Assert<Contract extends typeof Actual ? true : false>
export type Keys = Assert<Same<keyof typeof Actual,keyof Contract>>
export type Members = Assert<Same<{ [K in keyof typeof Actual]-?: Same<(typeof Actual)[K], Contract[K & keyof Contract]> }[keyof typeof Actual],true>>

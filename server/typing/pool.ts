import { Contract } from 'web3-eth-contract';

export interface Pool {
    pid: number;
    baseTokenName: string;
    baseTokenSymbol: string;
    baseTokenAmount: number;
    quoteTokenAmount: number;
    quoteTokenName: string;
    quoteTokenSymbol: string;
    baseTokenAmountWholeLP: number;
    quoteTokenAmountWholeLP: number;
    totalLPTokenStaked: number;
    lpTokenName: string;
    lpTokenSymbol: string;
    lpWethWorth: number;
    totalWethValue: number;
    tokenPriceInWeth: number;
    poolWeight: number;
}

export interface ContractAllocatedPoints {
    contract: Contract;
    allocPoint: number;
}

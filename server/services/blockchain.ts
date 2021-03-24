// eslint-disable-next-line @typescript-eslint/no-var-requires
const ERC20Abi = require('@contracts/abi/erc20.json');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MasterChefAbi = require('@contracts/abi/masterchef.json');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const UniV2LPAbi = require('@contracts/abi/uni_v2_lp.json');

import config from '@server/config';
import { ContractAllocatedPoints, Pool } from '@server/typing/pool';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import { WebsocketProvider } from 'web3-core';
import { Contract } from 'web3-eth-contract';

let provider: WebsocketProvider;
let web3: Web3;
let masterContract: Contract;
let poolsCache: Pool[] = [];

export const getProvider = (): WebsocketProvider => {
    if (!provider) {
        provider = new Web3.providers.WebsocketProvider(config.web3.infuraUrl, {
            clientConfig: {
                keepalive: true,
                keepaliveInterval: 60000, // milliseconds
            },
            reconnect: {
                auto: true,
                delay: 2500,
                onTimeout: true,
            },
        });
    }

    return provider;
};

export const getWeb3 = (): Web3 => {
    if (!web3) {
        const provider = getProvider();
        web3 = new Web3(provider);
    }

    return web3;
};

export const getMasterContract = (): Contract => {
    if (!masterContract) {
        const web3 = getWeb3();

        masterContract = new web3.eth.Contract(MasterChefAbi, config.web3.masterContractAddress);
    }

    return masterContract;
};

export const getLPTokenContracts = async (): Promise<ContractAllocatedPoints[]> => {
    const web3 = getWeb3();
    const masterContract = getMasterContract();

    const poolLength = await masterContract.methods.poolLength().call();

    const contracts: ContractAllocatedPoints[] = [];

    for (let poolIndex = 0; poolIndex < poolLength; poolIndex++) {
        const { lpToken, allocPoint } = await masterContract.methods.poolInfo(poolIndex).call();

        const lpTokenContract = new web3.eth.Contract(UniV2LPAbi, lpToken);
        contracts.push({ contract: lpTokenContract, allocPoint });
    }

    return contracts;
};

export const getErc20Contract = (address: string): Contract => {
    const web3 = getWeb3();

    return new web3.eth.Contract(ERC20Abi, address);
};

export const getPoolData = async (
    pid: number,
    lpTokenContract: Contract,
    allocPoint: string | number,
    totalAllocPoint: number,
): Promise<Pool> => {
    const [token0address, token1address] = await Promise.all([
        lpTokenContract.methods
            .token0()
            .call()
            .catch(() => lpTokenContract.options.address),
        lpTokenContract.methods
            .token1()
            .call()
            .catch(() => lpTokenContract.options.address),
    ]);

    let baseTokenContract = getErc20Contract(token0address);
    let quoteTokenContract = getErc20Contract(token1address);

    if (baseTokenContract.options.address === config.web3.weth) {
        [baseTokenContract, quoteTokenContract] = [quoteTokenContract, baseTokenContract];
    }

    const [
        lpTokenTotalSupply,
        lpMasterBalance,
        baseTokenDecimals,
        quoteTokenDecimals,
        lpContractWeth,
    ] = await Promise.all([
        lpTokenContract.methods.totalSupply().call(),
        lpTokenContract.methods
            .balanceOf(masterContract.options.address)
            .call()
            .then((n: string) => new BigNumber(n)),
        baseTokenContract.methods
            .decimals()
            .call()
            .then((n: string) => new BigNumber(n)),
        quoteTokenContract.methods
            .decimals()
            .call()
            .then((n: string) => new BigNumber(n)),
        quoteTokenContract.methods
            .balanceOf(lpTokenContract.options.address)
            .call()
            .then((n: string) => new BigNumber(n)),
    ]);

    const [baseTokenAmountWholeLP, quoteTokenAmountWholeLP] = await Promise.all([
        baseTokenContract.methods
            .balanceOf(lpTokenContract.options.address)
            .call()
            .then((n: string) => new BigNumber(n).div(new BigNumber(10).pow(baseTokenDecimals))),
        quoteTokenContract.methods
            .balanceOf(lpTokenContract.options.address)
            .call()
            .then((n: string) => new BigNumber(n).div(new BigNumber(10).pow(quoteTokenDecimals))),
    ]);

    const portionLp = lpMasterBalance.div(lpTokenTotalSupply);

    const totalLpWethValue = portionLp.times(lpContractWeth).times(new BigNumber(2));

    // Calculate
    const baseTokenAmount = baseTokenAmountWholeLP.times(portionLp);

    const quoteTokenAmount = quoteTokenAmountWholeLP.times(portionLp);

    const [lpTokenSymbol, quoteTokenSymbol, baseTokenSymbol] = await Promise.all([
        lpTokenContract.methods.symbol().call(),
        quoteTokenContract.methods
            .symbol()
            .call()
            .then((val: string) => val.replace('WETH', 'ETH')),
        baseTokenContract.methods.symbol().call(),
    ]);
    const lpTokenName = `${baseTokenSymbol}-${quoteTokenSymbol} ${lpTokenSymbol}`;
    const tokenPriceInWeth = quoteTokenAmountWholeLP.div(baseTokenAmountWholeLP).toNumber();

    const [baseTokenName, quoteTokenName] = await Promise.all([
        baseTokenContract.methods.name().call(),
        quoteTokenContract.methods.name().call(),
    ]);

    return {
        pid: pid++,
        baseTokenName,
        baseTokenSymbol,
        baseTokenAmount: baseTokenAmount.toNumber(),
        quoteTokenAmount: quoteTokenAmount.toNumber(),
        quoteTokenName,
        quoteTokenSymbol,
        baseTokenAmountWholeLP: baseTokenAmountWholeLP.toNumber(),
        quoteTokenAmountWholeLP: quoteTokenAmountWholeLP.toNumber(),
        totalLPTokenStaked: lpMasterBalance.div('1e18').toNumber(),
        lpTokenName,
        lpTokenSymbol,
        lpWethWorth: lpContractWeth.div('1e18').toNumber(),
        totalWethValue: totalLpWethValue.div('1e18').toNumber(),
        tokenPriceInWeth,
        poolWeight: Number(allocPoint) / totalAllocPoint,
    };
};

export const getPools = async (skipEmptyAllocPoint = true, updateCache = false): Promise<Pool[]> => {
    const masterContract = getMasterContract();
    const totalAllocPoint = await masterContract.methods
        .totalAllocPoint()
        .call()
        .then((r: string) => Number(r));

    const lpContracts = await getLPTokenContracts();

    const pools = await Promise.all(
        lpContracts.map(({ contract, allocPoint }, index) => {
            if (!skipEmptyAllocPoint || Number(allocPoint)) {
                return getPoolData(index, contract, allocPoint, totalAllocPoint);
            }
        }),
    );

    const filteredPools: Pool[] = pools.filter((pool): pool is Pool => !!pool);

    const crdCrdPool = filteredPools.find((pool: Pool) => pool.lpTokenName === 'CRD-CRD CRD');

    if (crdCrdPool) {
        const sourcePool = filteredPools.find((pool) => pool.lpTokenName === 'CRD-ETH UNI-V2');

        if (sourcePool) {
            crdCrdPool.tokenPriceInWeth = sourcePool.tokenPriceInWeth;
        }
        crdCrdPool.baseTokenAmount = crdCrdPool.totalLPTokenStaked;
        crdCrdPool.quoteTokenAmount = 0;
        crdCrdPool.totalWethValue = new BigNumber(crdCrdPool.baseTokenAmount)
            .times(crdCrdPool.tokenPriceInWeth)
            .toNumber();
    }

    if (updateCache) {
        poolsCache = filteredPools;
    }

    return filteredPools;
};

export const getPoolsCached = (): Pool[] => poolsCache;

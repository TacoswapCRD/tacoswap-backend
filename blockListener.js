const BigNumber = require('bignumber.js');
const Web3 = require('web3');


const {
    INFURA_URL,
    MASTER_CONTRACT_ADDRESS,
    WETH,
} = require('./constants')
const MasterChefAbi = require('./abi/masterchef.json');
const UniV2LPAbi = require('./abi/uni_v2_lp.json');
const ERC20Abi = require('./abi/erc20.json');
const {
    sleep,
} = require('./utils')

  const provider = new Web3.providers.WebsocketProvider(
    INFURA_URL, {
    clientConfig: {
      keepalive: true,
      keepaliveInterval: 60000  // milliseconds
    },
    reconnect: {
      auto: true,
      delay: 2500,
      onTimeout: true,
    }
  });

const web3 = new Web3(provider);
const masterContract = new web3.eth.Contract(MasterChefAbi, MASTER_CONTRACT_ADDRESS);

async function loadData() {
    let poolLength = await masterContract.methods.poolLength().call();
    const totalAllocPoint = await masterContract.methods.totalAllocPoint().call().then((r) => Number(r));
    const data = [];
    while (poolLength--) {
        const { lpToken, allocPoint } = await masterContract.methods.poolInfo(poolLength).call();
        if (!Number(allocPoint)) {
            continue;
        }
        const lpTokenContract = new web3.eth.Contract(UniV2LPAbi, lpToken);
        try {
            const [token0, token1] = await Promise.all([
                lpTokenContract.methods.token0().call().catch(() => lpTokenContract.options.address),
                lpTokenContract.methods.token1().call().catch(() => lpTokenContract.options.address)
            ])
            let baseTokenContract = new web3.eth.Contract(
                ERC20Abi,
                token0,
            );
            let quoteTokenContract = new web3.eth.Contract(
                ERC20Abi,
                token1,
            );
            if (baseTokenContract.options.address === WETH) {
                [
                    baseTokenContract,
                    quoteTokenContract
                ] = [
                    quoteTokenContract,
                    baseTokenContract
                ];
            }

            const [
                lpTokenTotalSupply,
                lpMasterBalance,
                baseTokenDecimals,
                quoteTokenDecimals,
                lpContractWeth,
            ] = await Promise.all([
                lpTokenContract.methods
                    .totalSupply()
                    .call(),
                lpTokenContract.methods
                    .balanceOf(masterContract.options.address)
                    .call()
                    .then((n) => new BigNumber(n)),
                baseTokenContract.methods
                    .decimals()
                    .call()
                    .then((n) => new BigNumber(n)),
                quoteTokenContract.methods
                    .decimals()
                    .call()
                    .then((n) => new BigNumber(n)),
                quoteTokenContract.methods
                    .balanceOf(lpTokenContract.options.address)
                    .call().then((n) => new BigNumber(n))
            ])

            const [
                baseTokenAmountWholeLP,
                quoteTokenAmountWholeLP,
            ] = await Promise.all([
                baseTokenContract.methods
                    .balanceOf(lpTokenContract.options.address)
                    .call()
                    .then((n) => new BigNumber(n).div(new BigNumber(10).pow(baseTokenDecimals))),
                quoteTokenContract.methods
                    .balanceOf(lpTokenContract.options.address)
                    .call()
                    .then((n) => new BigNumber(n).div(new BigNumber(10).pow(quoteTokenDecimals))),
            ])

            const portionLp = lpMasterBalance.div(lpTokenTotalSupply);

            let totalLpWethValue = portionLp.times(lpContractWeth).times(new BigNumber(2));

            // Calculate
            let baseTokenAmount = baseTokenAmountWholeLP.times(portionLp);

            let quoteTokenAmount = quoteTokenAmountWholeLP.times(portionLp);

            const [
                lpTokenSymbol,
                quoteTokenSymbol,
                baseTokenSymbol,
            ] = await Promise.all([
                lpTokenContract.methods
                    .symbol()
                    .call(),
                quoteTokenContract.methods
                    .symbol()
                    .call()
                    .then(val => val.replace('WETH', 'ETH')),
                baseTokenContract.methods
                    .symbol()
                    .call(),
            ])
            const lpTokenName = `${baseTokenSymbol}-${quoteTokenSymbol} ${lpTokenSymbol}`;
            let tokenPriceInWeth = quoteTokenAmountWholeLP.div(baseTokenAmountWholeLP).toNumber();
            if (lpTokenName === 'CRD-CRD CRD') {
                tokenPriceInWeth = data[6].tokenPriceInWeth;
                baseTokenAmount = lpMasterBalance.div('1e18');
                quoteTokenAmount = new BigNumber(0);
                totalLpWethValue = baseTokenAmount.times(tokenPriceInWeth).times(new BigNumber(10).pow(18));
            }

            const [
                baseTokenName,
                quoteTokenName,
            ] = await Promise.all([
                baseTokenContract.methods.name().call(),
                quoteTokenContract.methods.name().call(),
            ])
            data.push({
                pid: poolLength,
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
                totalWethValue: totalLpWethValue.div(new BigNumber(10).pow(18)).toNumber(),
                tokenPriceInWeth,
                poolWeight: Number(allocPoint) / totalAllocPoint,
            });
            console.log(poolLength);
        } catch (e) {
            console.error(e);
        }
    }
    return data;
}


module.exports = async (blockHandler) => {
    await loadData();
    web3.eth.subscribe('newBlockHeaders', async (error) => {
         if (error) {
             console.error(error);
             return;
         }
         const n = await loadData();
         blockHandler(n);
    }).on("error", console.error);
}

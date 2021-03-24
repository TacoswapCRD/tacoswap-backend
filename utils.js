const BigNumber = require('bignumber.js');


async function sleep(time = 1000) {
    return new Promise(res => setTimeout(res, time))
}


async function getTotalLPWethValue(
    masterChefContract,
    lpContract,
    tokenContract,
    quoteTokenContract,
    pid,
) {
    const [
        balance,
        tokenAmountWholeLP,
        quoteTokenAmountWholeLP,
        tokenDecimals,
        quoteTokenDecimals,
        totalSupply,
        lpContractWeth,
    ] = await Promise.all([
        lpContract.methods
            .balanceOf(masterChefContract.options.address)
            .call()
            .then((n) => new BigNumber(n)),
        tokenContract.methods
            .balanceOf(lpContract.options.address)
            .call(),
        quoteTokenContract.methods
            .balanceOf(lpContract.options.address)
            .call(),
        tokenContract.methods
            .decimals()
            .call(),
        quoteTokenContract.methods
            .decimals()
            .call(),
        lpContract.methods
            .totalSupply()
            .call()
            .then((n) => new BigNumber(n)),
        quoteTokenContract.methods
            .balanceOf(lpContract.options.address)
            .call().then((n) => new BigNumber(n))
    ])

    const notLP = tokenContract.options.address === lpContract.options.address;

    // Convert that into the portion of total lpContract = p1
    // Get total weth value for the lpContract = w1
    // Return p1 * w1 * 2
    const portionLp = new BigNumber(balance)
        .div(totalSupply)
    const totalLpWethValue = portionLp
        .times(lpContractWeth)
        .times(new BigNumber(2))
    // Calculate
    const tokenAmount = (
        notLP
            ? new BigNumber(
                await tokenContract.methods
                    .balanceOf(masterChefContract.options.address)
                    .call()
            )
            : new BigNumber(tokenAmountWholeLP)
                .times(portionLp)
    ).div(
        new BigNumber(10)
            .pow(tokenDecimals)
    )

    const quoteTokenAmount = new BigNumber(quoteTokenAmountWholeLP)
        .times(portionLp)
        .div(
            new BigNumber(10)
                .pow(quoteTokenDecimals)
        )

    const wethAmount = lpContractWeth
        .times(portionLp)
        .div(new BigNumber(10).pow(18))

    return {
        pid,
        tokenAmount,
        quoteTokenAmount,
        wethAmount,
        totalLPTokenSupply: totalSupply.div('1e18'),
        totalLPTokenStaked: balance.div('1e18'),
        tokenAmountWholeLP: new BigNumber(tokenAmountWholeLP).div('1e18'),
        quoteTokenAmountWholeLP: new BigNumber(quoteTokenAmountWholeLP).div('1e18'),
        lpWethWorth: lpContractWeth.div('1e18'),
        totalWethValue: notLP ? new BigNumber(price).times(tokenAmount) : totalLpWethValue.div(new BigNumber(10).pow(18)),
        tokenPriceInWeth: notLP ? new BigNumber(price).times(totalSupply).div(tokenAmountWholeLP) : wethAmount.div(tokenAmount),
        poolWeight: await getPoolWeight(masterChefContract, pid),
    }
}


module.exports = {
    sleep,
    getTotalLPWethValue,
}

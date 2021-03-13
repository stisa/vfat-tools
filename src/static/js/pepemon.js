$(function () {
    consoleInit()
    start(main)
});

const LPPool = {
    token1: 'PPBLZ',
    token2: 'ETH',
    lpAddress: '0x9479b62fd1cb36f8fed1eebb1bb373d238d08216',
    poolAddress: '0xf1f508c7c9f0d1b15a76fba564eef2d956220cf7',
    rewardAddress: '0xf1f508c7c9f0d1b15a76fba564eef2d956220cf7'
}
const SubPool = {
    token1: 'PPDEX',
    token2: 'ETH',
    lpAddress: '0x6b1455e27902ca89ee3abb0673a8aa9ce1609952',
    poolAddress: '0x1Dd77156DBc9A4b2F574A54DA28923b8007c2846'
}

const lookUpPricesAndCap = async function(id_array) {
    const pricesAndCaps = {}
    for (const id_chunk of chunk(id_array, 50)) {
      let ids = id_chunk.join('%2C')
      let res = await $.ajax({
        url: 'https://api.coingecko.com/api/v3/simple/price?ids=' + ids + '&vs_currencies=usd&include_market_cap=true',
        type: 'GET',
      })
      for (const [key, v] of Object.entries(res)) {
        if (v.usd) pricesAndCaps[key] = v;
      }
    }
    return pricesAndCaps
}

function printAPR(rewardTokenTicker, rewardPrice, rewardRatio,
    stakeTokenTicker, staked_tvl, userStaked, poolTokenPrice,
    fixedDecimals) {
    let usdPerDay = 1*rewardRatio*rewardPrice;
    let dailyAPR = usdPerDay / (1*poolTokenPrice) * 100
    fixedDecimals = fixedDecimals ?? 2;

    _print(`APR: Day ${dailyAPR.toFixed(2)}% Week ${(dailyAPR*7).toFixed(2)}% Year ${(dailyAPR*365).toFixed(2)}%`);
    let userStakedUsd = userStaked * poolTokenPrice;
    let userStakedPct = userStakedUsd / staked_tvl * 100;
    _print(`You are staking ${userStaked.toFixed(fixedDecimals)} ${stakeTokenTicker} ($${formatMoney(userStakedUsd)}), ${userStakedPct.toFixed(2)}% of the pool.`);
    let userDailyRewards = userStaked*usdPerDay;
    let userWeeklyRewards = userDailyRewards*7;
    let userYearlyRewards = userWeeklyRewards * 52;
    if (userStaked > 0) {
    _print(`Estimated ${rewardTokenTicker} earnings:`
    + ` Day ${userDailyRewards.toFixed(fixedDecimals)} ($${formatMoney(userDailyRewards*rewardPrice)})`
    + ` Week ${userWeeklyRewards.toFixed(fixedDecimals)} ($${formatMoney(userWeeklyRewards*rewardPrice)})`
    + ` Year ${userYearlyRewards.toFixed(fixedDecimals)} ($${formatMoney(userYearlyRewards*rewardPrice)})`);
    }
}

async function main() {
    const App = await init_ethers()

    _print(`Initialized ${App.YOUR_ADDRESS}`)
    _print('Reading smart contracts...\n')

    const ppContract = new ethers.Contract(LPPool.rewardAddress, PPABI, App.provider);
    const subContract = new ethers.Contract(SubPool.poolAddress, PPSUBABI, App.provider);

    const tokensIDs = ["ethereum", "pepemon-pepeballs", "pepedex"]

    let pAndc = await lookUpPricesAndCap(tokensIDs)
    console.log(pAndc)

    let stakedBLZ = (await ppContract.getAddressPpblzStakeAmount(App.YOUR_ADDRESS)) / 1e18
    let stakedLP = (await ppContract.getAddressUniV2StakeAmount(App.YOUR_ADDRESS)) / 1e18
    let availableRewards = (await ppContract.myRewardsBalance(App.YOUR_ADDRESS)) / 1e18
    let dailyBLZRewards = 0
    let dailyLPRewards = 0
    let dailyRewards = 0

    let subSuscribed = await subContract.isUserStaking(App.YOUR_ADDRESS)
    let hasMinted = false
    if (subSuscribed) {
        let lastNftID = await subContract.normalID()
        hasMinted = await subContract.hasUserMinted(App.YOUR_ADDRESS, lastNftID)
    }

    if (stakedBLZ > 0) {
        dailyBLZRewards += stakedBLZ*19/365
    }
    if (stakedLP > 0) {
        //TODO: get blz in lp part, * 38/365
        dailyLPRewards += 0
    }
    dailyRewards = dailyBLZRewards+dailyLPRewards

    // Output:
    _print(`[Pepemon One]`) // link to medium
    _print(`Locked: 1234 PPDEX-ETH LP ($240'000)`)
    _print(`You have locked 4 PPDEX-ETH LP ($1000)`)
    _print(`Subscribed: ${subSuscribed ? "yes" : "no"}`)
    if (subSuscribed && !hasMinted) {
        _print_link(`Card available to mint!`, "mintNFT")
    } else {
        _print(`Card already minted!`)
        _print(`Next card in ... blocks (approx. NN days)`)
    }
    //if lock period ended...
    _print_link(`Unsubscribe\n`, "unsub")

    _print(`[PPDEX] [<=>] Price: $${formatMoney(pAndc.pepedex.usd)}`) // Cap: ${pAndc.pepedex.usd_market_cap}`) don't get how to calculate this tbh
    _print(`Estimated combined PPDEX earnings: Day ${dailyRewards.toFixed(2)} ($${formatMoney(pAndc.pepedex.usd*dailyRewards)}) Week ${(7*dailyRewards).toFixed(2)} ($${formatMoney(7*pAndc.pepedex.usd*dailyRewards)}) Year ${(365*dailyRewards).toFixed(2)} ($${formatMoney(365*pAndc.pepedex.usd*dailyRewards)})`)
    _print_link(`Claim ${availableRewards.toFixed(2)} PPDEX ($${(pAndc.pepedex.usd*availableRewards).toFixed(2)})\n`, "claimfunction")

    _print(`[PPBLZ] [<=>] Price: $${formatMoney(pAndc["pepemon-pepeballs"].usd)} Cap: $${formatMoney(pAndc["pepemon-pepeballs"].usd_market_cap)}`)
    _print(`Staked: 13388.1230 PPBLZ ($4,797,541.40)`)
    //_print(`PPDEX Per Day: 9397.27 ($129,682.27)`)
    _print(`APR: Day 0.39% Week 2.70% Year 140.56%`)
    _print(`You are staking ${stakedBLZ.toFixed(2)} PPBLZ ($${(pAndc["pepemon-pepeballs"].usd*stakedBLZ).toFixed(2)}), percent% of the pool.`)
    _print(`Estimated PPDEX earnings: Day ${dailyBLZRewards.toFixed(2)} ($${formatMoney(pAndc.pepedex.usd*dailyBLZRewards)}) Week ${(7*dailyBLZRewards).toFixed(2)} ($${formatMoney(7*pAndc.pepedex.usd*dailyBLZRewards)}) Year ${(365*dailyBLZRewards).toFixed(2)} ($${formatMoney(365*pAndc.pepedex.usd*dailyLPRewards)})`)
    _print_link(`Stake 0.00 PPBLZ`, "stake")
    _print_link(`Unstake ${stakedBLZ.toFixed(2)} PPBLZ ($${formatMoney(pAndc["pepemon-pepeballs"].usd*stakedBLZ)})\n`, "unstake")


    _print(`[PPBLZ]-[ETH]-- Uni LP [+] [-] [<=>] Price: $358.34 TVL: $4,837,253.13`)
    _print(`PPBLZ Price: $${formatMoney(pAndc["pepemon-pepeballs"].usd)}`)
    _print(`ETH Price: $${formatMoney(pAndc["ethereum"].usd)}`)
    _print(`Staked: 13388.1230 UNI-V2 ($4,797,541.40)`)
    //_print(`PPDEX Per Day: 9397.27 ($129,682.27)`)
    _print(`APR: Day 0.39% Week 2.70% Year 140.56%`)
    _print(`You are staking ${stakedLP.toFixed(2)} ETH-PPBLZ LP ($$money), percent% of the pool.`)
    _print(`Estimated PPDEX earnings: Day ${dailyLPRewards.toFixed(2)} ($${formatMoney(pAndc.pepedex.usd*dailyBLZRewards)}) Week ${(7*dailyLPRewards).toFixed(2)} ($${formatMoney(7*pAndc.pepedex.usd*dailyBLZRewards)}) Year ${(365*dailyLPRewards).toFixed(2)} ($${formatMoney(365*pAndc.pepedex.usd*dailyBLZRewards)})`)
    _print_link(`Stake 0.00 PPBLZ-ETH LP`, "stake")
    _print_link(`Unstake ${stakedLP.toFixed(2)} PPBLZ-ETH LP\n`, "unstake")

    hideLoading()
}

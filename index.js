const process = require('process')
const args = require('args-parser')(process.argv);

console.log(args)

console.log('ZEPHYR 自动质押工具')
console.log('作者地址：ZEPHsAskRc6L8J8cvaSqPVHpBxxX1cTCmca71peeZhuhQjN8vKbD3bqZcuQdZ81iK7hbvNksa5H6QHkZaPkKWs2sLA7g5aXuCLG')
console.log()

let walletPath = args['wallet']
let serverUri = args['server']
let mnemonic = args['mnemonic']
let restoreHeight = args['restore']
let tick = args['tick'] || 10000

const zephryjs = require("zephyr-javascript")
const fs = require('fs')

class Listener extends zephryjs.MoneroWalletListener {
    onSyncProgress(height, startHeight, endHeight, percentDone, message) {
        console.log('同步进度 ' + Math.round(percentDone * 10000) / 100 + '%');
    }
}

function delay(timeMs) {
    return new Promise(resolve => setTimeout(resolve, timeMs));
}

async function main() {
    let wallet;
    if(fs.existsSync(walletPath)) {
        console.log('读取已保存钱包 ' + walletPath)
        wallet = await zephryjs.openWalletFull({
            path: walletPath,
            password: 'test',
            networkType: 'mainnet',
            serverUri: serverUri
        })
    }
    else {
        console.log('根据助记词创建钱包 ' + walletPath)
        wallet = await zephryjs.createWalletFull({
            path: walletPath,
            password: 'test',
            networkType: 'mainnet',
            serverUri: serverUri,
            mnemonic: mnemonic,
            restoreHeight: restoreHeight
        })
    }
    let address = await wallet.getAddress(0, 0)
    console.log('钱包地址：' + address)
    await wallet.sync(new Listener())
    console.log("同步完成")
    await wallet.startSyncing(1000)
    console.log("保存钱包")
    await wallet.save()
    while(true) {
        let height = await wallet.getHeight()
        let balance = (await wallet.getUnlockedBalance()).toDict()
        let allBalance = (await wallet.getBalance()).toDict()
        let reserveInfo = (await wallet.getReserveInfo()).toDict()
        console.log('Height   = ' + height)
        console.log('Address  = ' + address)
        console.log('ZEPH     = ' + balance.ZEPH    / 1000000000000 + ' (total ' + allBalance.ZEPH    / 1000000000000 + ')')
        console.log('ZSD      = ' + balance.ZEPHUSD / 1000000000000 + ' (total ' + allBalance.ZEPHUSD / 1000000000000 + ')')
        console.log('ZRS      = ' + balance.ZEPHRSV / 1000000000000 + ' (total ' + allBalance.ZEPHRSV / 1000000000000 + ')')
        console.log('ratio    = ' + reserveInfo.reserve_ratio    / 10000000000 + '%')
        console.log('ratio_ma = ' + reserveInfo.reserve_ratio_ma / 10000000000 + '%')
        try {
            let req = {
                address: address,
                accountIndex: 0,
                sourceCurrency: 'ZEPH',
                destinationCurrency: 'ZEPHRSV',
                priority: zephryjs.MoneroTxPriority.ELEVATED,
                relay: true
            }
            console.log('Swap ' + req.sourceCurrency + ' to ' + req.destinationCurrency)
            await wallet.sweepUnlocked(req)
            console.log('质押成功！！！！')
        } catch (e) {
            console.log('质押失败: ' + e)
        }
        console.log('保存钱包')
        await wallet.save()
        console.log('等待 ' + tick / 1000 + ' s 继续尝试')
        await delay(tick)
    }
}

main();
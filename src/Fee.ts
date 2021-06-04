import { default as fetch } from 'cross-fetch';
import { MyAsset, MyMoney, parseJSON } from './utils';
import { BigNumber } from '@waves/bignumber';

const DEFAULT_FEE = 100000;

export const getFeesByWavesMoney = (fees: Array<MyMoney>, wavesMoney: MyMoney): Array<MyMoney> => {
    const count = wavesMoney.getCoins()
        .div(DEFAULT_FEE)
        .roundTo(0, BigNumber.ROUND_MODE.ROUND_UP);

    return fees.reduce((acc, money) => {
        if (money.asset.id === 'WAVES') {
            acc.push(wavesMoney);
        } else {
            const feeInMoney = money.cloneWithTokens(money.getTokens().mul(count));
            if (feeInMoney.lte(money)) {
                acc.push(feeInMoney);
            }
        }
        return acc;
    }, []);
}

export const getFeeByTx = async (wavesAsset: MyAsset, fees: Array<MyMoney>, tx: any, nodeUrl = 'https://nodes.waves.exchange'): Promise<Array<MyMoney>> => {
    const { feeAmount } = await fetch(
        `${nodeUrl}/transactions/calculateFee`,
        {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ...tx, feeAssetId: null })
        }
    ).then(res => {
        if (res.status >= 400) {
            throw new Error("Bad response from server");
        }
        return res.text();
    }).then(parseJSON);

    const txFee = new MyMoney(feeAmount, wavesAsset);
    return getFeesByWavesMoney(fees, txFee);
}

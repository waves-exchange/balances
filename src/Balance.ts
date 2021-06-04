import { default as fetch } from 'cross-fetch';
import {
    parseJSON,
    NodeBalance,
    MyAsset,
    MyMoney,
    waitPromise,
    Poll, toHash
} from './utils';
import { getFeesByWavesMoney, getFeeByTx } from './Fee';
import { BigNumber } from '@waves/bignumber';
import { Assets } from './Assets';

type TCb = (balances?: Record<string, MyMoney>, diff?: Record<string, MyMoney>|null) => void;

type Props = {
    address: string;
    nodeUrl?: string;
    dataServicesUrl?: string;
    iconUrl?: string;
    updateBalancesMs?: number;
};

export class Balance {

    public address: string;
    public nodeUrl: string;
    public dataServicesUrl: string;
    public balances: Record<string, MyMoney> = Object.create(null);
    public feeList: Array<MyMoney> = [];
    public hasData = false;
    _onUpdateCbs = [] as Array<TCb>;
    _wavesAsset: MyAsset;
    _readyPromise: Promise<void>;
    _poll: Poll|null = null;
    _assets: Assets;

    constructor(props: Props) {
        const {
            address,
            iconUrl = 'https://waves.exchange/static/icons/assets',
            dataServicesUrl = 'https://waves.exchange/api/v1',
            nodeUrl = 'https://nodes.waves.exchange',
            updateBalancesMs = null
        } = props;
        this._assets = new Assets(dataServicesUrl, iconUrl);
        this.address = address;
        this.dataServicesUrl = dataServicesUrl;
        this.nodeUrl = nodeUrl;

        if (updateBalancesMs) {
            this._updateBalances(updateBalancesMs);
        } else {
            this._readyPromise = this._init();
        }
    }

    public destroy(): void {
        this.offUpdate();
        if (this._poll) {
            this._poll.stop();
            this._poll = null;
        }
    }

    public async getFeesByCoins(coins: MyMoney | BigNumber | number | string): Promise<Array<MyMoney>> {
        await this._readyPromise;
        const number = coins instanceof MyMoney ? coins.getCoins() : coins;
        return getFeesByWavesMoney(this.feeList, new MyMoney(number, this._wavesAsset));
    }

    public async getFees(tx: any): Promise<Array<MyMoney>> {
        await this._readyPromise;
        return getFeeByTx(this._wavesAsset, this.feeList, tx, this.nodeUrl);
    }

    public async getBalances(): Promise<void> {
        if (this._readyPromise) {
            return this._readyPromise;
        }

        this._readyPromise = this._init();
    }

    public onUpdate(cb: TCb): void {
        this._onUpdateCbs.push(cb);
    }

    public offUpdate(cb?: TCb): void {
        this._onUpdateCbs = cb ? this._onUpdateCbs.filter(item => item !== cb) : [];
    }

    private async _getBalances(): Promise<void> {
        const wavesResponse = await this._fetchWavesBalances();
        const { balances } = await this._fetchBalances() as any;
        const assetsToGet = (balances || []).map((item: any) => item.assetId);
        const assets = await this._assets.getAssets(['WAVES', ...assetsToGet]);
        const assetsHash = toHash(assets, 'id');
        this._wavesAsset = assetsHash['WAVES'];
        const wavesBalance = new MyMoney(wavesResponse.available, assetsHash['WAVES']);
        const balancesHash = balances.reduce((acc: Record<string, MyMoney>, item: NodeBalance) => {
            const asset = assetsHash[item.assetId];
            acc[item.assetId] = new MyMoney(item.balance, asset);
            return acc;
        }, Object.create(null) as Record<string, MyMoney>);

        const newBalances = { ...balancesHash, WAVES: wavesBalance };
        const diff = this._getDiff(newBalances);
        this.hasData = true;

        if (!diff) {
            return null;
        }

        this.balances = newBalances;
        this.feeList = Object.values(this.balances).filter(item => {
            return item.asset.id === 'WAVES' || Number(item.asset.minSponsoredFee) > 0
        });
        this._onUpdate(diff);
    }

    private async _fetchWavesBalances(): Promise<any> {
        return await fetch(`${this.nodeUrl}/addresses/balance/details/${this.address}`)
            .then((res: any) => {
                if (res.status >= 400) {
                    throw new Error('Bad response from server');
                }
                return res.text();
            })
            .then(parseJSON);
    }

    private async _fetchBalances(): Promise<Array<NodeBalance>> {
        return await fetch(`${this.nodeUrl}/assets/balance/${this.address}`)
            .then((res: any) => {
                if (res.status >= 400) {
                    throw new Error('Bad response from server');
                }
                return res.text();
            })
            .then(parseJSON);
    }

    private _getDiff(balances: Record<string, MyMoney>): Record<string, MyMoney> | null {
        const currentBalances = Object.values(this.balances);
        const newBalances = Object.values(balances);
        const iterateFromCurrent = currentBalances.length > newBalances.length;
        const iterateBalances = iterateFromCurrent ? currentBalances : newBalances;
        const moneyHash = iterateFromCurrent ? balances : this.balances;
        return iterateBalances.reduce((acc: Record<string, MyMoney>|null, money) => {
            const id = money.asset.id;
            const refMoney = moneyHash[id];
            if (!refMoney) {
                acc = acc || Object.create(null);
                acc[id] = iterateFromCurrent ? new MyMoney(0, money.asset) : money;
                return acc;
            }

            if (!refMoney.eq(money)) {
                acc = acc || Object.create(null);
                acc[id] = iterateFromCurrent ? refMoney : money;
            }

            return acc;
        }, null);
    }

    private async _init(): Promise<void> {
        while (true) {
            try {
                await this._getBalances();
                break;
            } catch (e) {
                console.error('Retry Fetch Balances', e);
                await waitPromise(5000);
            }
        }
    }

    private _onUpdate(diff: Record<string, MyMoney>): void {
         this._onUpdateCbs.forEach(item => item(this.balances, diff));
    }

    private _updateBalances(timeMs: number): void {
        this._poll = new Poll(timeMs, () => {
            this._readyPromise = null;
            this._readyPromise = this.getBalances();
            return this._readyPromise;
        });
        this._poll.start();
    }
}

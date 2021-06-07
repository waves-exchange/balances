import { Money, Asset } from '@waves/data-entities';
import { TMoneyInput } from '@waves/data-entities/dist/entities/Money';



export const toHash = <T, K extends keyof T>(arr: Array<T>, field: K): Record<string, T>  => {
    return arr.reduce((acc, item) => {
        const key = String(item[field]);
        acc[key] = item;
        return acc;
    }, Object.create(null) as Record<string, T>);
}

const JSON_Parser_reg = new RegExp('((?!\\\\)"\\w+"):\\s*(-?[\\d|\.]{14,}(e-?\\d+)?)', 'g');

export const parseJSON = function (string: string) {
    return JSON.parse(string.replace(JSON_Parser_reg, `$1:"$2"`));
};

export type MyAsset = Asset & { verifiedStatus: number; hasImage: boolean, icon: string|null };
export type NodeBalance = {
    assetId: string;
    balance: number|string;
    reissuable: boolean;
    minSponsoredAssetFee: number|string;
    sponsorBalance: number|string;
    quantity: number|string;
    issueTransaction: any;

};
export type ServiceAsset = {
    type: 'asset';
    data : {

        ticker: string | null;
        timestamp: string;
        id: string;
        height: number;
        name: string;
        description: string;
        precision: number;
        sender: string;
        quantity: string | number;
        reissuable: boolean;
        has_script: boolean;
        min_sponsored_fee: string | number | null;
        smart: boolean;
    }
    metadata: { oracle_data: Array<any>; has_image: boolean; verified_status: number };

};

export class MyMoney extends Money {
    asset: MyAsset;

    constructor(coins: TMoneyInput, asset: MyAsset) {
        super(coins, asset);
    }

    cloneWithCoins(coins: TMoneyInput): MyMoney {
        const money = super.cloneWithCoins(coins);
        return new MyMoney(money.getCoins(), this.asset);
    }

    cloneWithTokens(tokens: TMoneyInput): MyMoney {
        const money = super.cloneWithTokens(tokens);
        return new MyMoney(money.getCoins(), this.asset);
    }
}
export const convertToExtendedAsset = (asset: ServiceAsset, iconApiUrl: string): MyAsset => {
    const {
        data,
        metadata
    } = asset;

    const {
        has_script,
        description,
        min_sponsored_fee,
        height,
        id,
        name,
        precision,
        quantity,
        reissuable,
        sender,
        ticker,
        timestamp
    } = data;

    const newAsset = new Asset({
        id,
        height,
        name,
        precision,
        description,
        quantity,
        reissuable,
        sender,
        ticker,
        timestamp: new Date(timestamp),
        hasScript: has_script,
        minSponsoredFee: min_sponsored_fee
    });

    return Object.assign(newAsset, {
        hasImage: metadata.has_image,
        icon: metadata.has_image ? `${iconApiUrl}/${newAsset.id}.svg` : null,
        verifiedStatus: metadata.verified_status
    });
}

export const waitPromise = (timeMs: number) => new Promise((res) => setTimeout(res, timeMs));

export class Poll {
    isWorked: boolean = false;
    _cb: any;
    _cbOut?: any;

    constructor(public timeMs: number, action: Function, onData?: Function) {
        this._cb = action;
        this._cbOut = onData;
    }

    start(): void {
        this.isWorked = true;
        this._start();
    }

    stop(): void {
        this.isWorked = false;
    }

    async _start() {
        while (true) {
            if (!this.isWorked) {
                return;
            }
            try {
                const res = await this._cb();
                if (this._cbOut) {
                    this._cbOut(res);
                }

            } catch (e) {

            }

            await waitPromise(this.timeMs);
        }
    }

}

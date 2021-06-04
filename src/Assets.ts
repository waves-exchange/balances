import { convertToExtendedAsset, MyAsset, parseJSON, ServiceAsset, waitPromise } from './utils';
import { default as fetch } from 'cross-fetch';

export class Assets {

    dataServicesUrl: string;
    iconUrl: string;
    assets: Record<string, MyAsset> = Object.create(null);

    _assetsPromise: Record<string, { index: number, promise: Promise<MyAsset[]> }> = Object.create(null);

    constructor(dataServiceUrl = 'https://waves.exchange/api/v1', iconUrl = 'https://waves.exchange/static/icons/assets') {
        this.iconUrl = iconUrl;
        this.dataServicesUrl = dataServiceUrl;
    }

    public async getAssets(assets: Array<string>): Promise<Array<MyAsset>> {
        const assetsToFetch = assets.filter(id => !this.assets[id] || !this._assetsPromise[id]);
        const waitPromises = assets.filter(id => this._assetsPromise[id]).map(id => this._assetsPromise[id].promise);

        while (true) {
            try {
                const promise = this._fetchAssets(assetsToFetch)
                    .then(assets => {
                        assets.forEach(asset => {
                            this.assets[asset.id] = asset;
                        });
                        return assets;
                    });
                assetsToFetch.forEach((id, index) => {
                    this._assetsPromise[id] = { promise, index };
                });
                await Promise.all([promise, ...waitPromises]);
                break;
            } catch (e) {
                await waitPromise(5000);
            }
        }
        return assets.map(id => this.assets[id]);
    }

    private _fetchAssets(assets: Array<string>): Promise<Array<MyAsset>> {
        return fetch(`${this.dataServicesUrl}/assets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: assets })
        }).then((res: any) => {
                if (res.status >= 400) {
                    throw new Error('Bad response from server');
                }
                return res.text();
            })
            .then(parseJSON).then(res => res.data)
            .then(assets => assets.map((item: ServiceAsset) => convertToExtendedAsset(item, this.iconUrl)));
    }
}

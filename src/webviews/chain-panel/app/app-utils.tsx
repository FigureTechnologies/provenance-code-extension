import { Alert, ChainViewAppBinding } from './app-binding';
import { ProvenanceKey } from './provenance-key';
import { ProvenanceMarker, ProvenanceMarkerAccessControl } from './provenance-marker';

export class Utils {

    static createKey (name: string): Promise<(ProvenanceKey | undefined)> {
        const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
        return appBinding.createKey(name);
    }

    static recoverKey (name: string, mnemonic: string): Promise<(ProvenanceKey | undefined)> {
        const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
        return appBinding.recoverKey(name, mnemonic);
    }

    static deleteKey (name: string): Promise<void> {
        const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
        return appBinding.deleteKey(name);
    }

    static createMarker (denom: string, supply: number, type: string, manager: string, access: ProvenanceMarkerAccessControl[]): Promise<(ProvenanceMarker | undefined)> {
        const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
        return appBinding.createMarker(denom, supply, type, manager, access);
    }

    static deleteMarker (denom: string, from: string): Promise<void> {
        const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
        return appBinding.deleteMarker(denom, from);
    }

    static grantMarkerPrivs (denom: string, access: ProvenanceMarkerAccessControl[], from: string): Promise<(ProvenanceMarker | undefined)> {
        const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
        return appBinding.grantMarkerPrivs(denom, access, from);
    }

    static revokeMarkerPrivs (denom: string, address: string, from: string): Promise<(ProvenanceMarker | undefined)> {
        const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
        return appBinding.revokeMarkerPrivs(denom, address, from);
    }

    static mintCoin (denom: string, amount: number, minter: string): Promise<void> {
        const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
        return appBinding.mintCoin(denom, amount, minter);
    }

    static burnCoin (denom: string, amount: number, burner: string): Promise<void> {
        const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
        return appBinding.burnCoin(denom, amount, burner);
    }

    static showAlert (type: Alert, title: string, body: string, dismissable: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
            appBinding.showAlert(type, title, body, dismissable);
            resolve();
        });
    }

    static getKeyForAddress (keys: ProvenanceKey[], address: string): (ProvenanceKey | undefined) {
        return keys.find((key) => {
            return (key.address == address);
        });
    }

}

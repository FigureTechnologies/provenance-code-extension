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

    static showAlert (type: Alert, title: string, body: string, dismissable: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
            appBinding.showAlert(type, title, body, dismissable);
            resolve();
        });
    }

}

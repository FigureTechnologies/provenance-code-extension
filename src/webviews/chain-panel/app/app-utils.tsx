import { Alert, ChainViewAppBinding } from './app-binding';
import { ProvenanceKey } from './provenance-key';

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

    static showAlert (type: Alert, title: string, body: string, dismissable: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
            appBinding.showAlert(type, title, body, dismissable);
            resolve();
        });
    }

}

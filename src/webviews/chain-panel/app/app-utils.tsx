import { Alert, ChainViewAppBinding } from './app-binding';
import { ProvenanceKey } from './provenance-key';
import { ProvenanceMarker, ProvenanceMarkerAccessControl } from './provenance-marker';

const EmailAddressValidation = new RegExp(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

const UrlValidation = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator

const GitUrlValidation = new RegExp(/(?:git|ssh|https?|git@[-\w.]+):(\/\/)?(.*?)(\.git)(\/?|\#[-\d\w._]+?)$/);

export class Utils {

    static validateAddress(addr: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!addr.startsWith('tp') && !addr.startsWith('pb')) {
                reject(new Error("Invalid address. Must start with 'tp' or 'pb'."));
            } else if (addr.length != 41) {
                reject(new Error("Invalid address. Must have length of 41."));
            } else if (!addr.match("^[A-Za-z0-9]+$")) {
                reject(new Error("Invalid address. Must not have special characters."));
            } else {
                resolve();
            }
        });
    }

    static validateEmailAddress(email: string): boolean {
        return EmailAddressValidation.test(email);
    }

    static validateUrl(url: string): boolean {
        return UrlValidation.test(url);
    }

    static validateGitUrl(url: string): boolean {
        return GitUrlValidation.test(url);
    }

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

    static withdrawCoin (denom: string, amount: number, address: string, signer: string): Promise<void> {
        const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
        return appBinding.withdrawCoin(denom, amount, address, signer);
    }

    static sendCoin (denom: string, amount: number, address: string, sender: string): Promise<void> {
        const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
        return appBinding.sendCoin(denom, amount, address, sender);
    }

    static showAlert (type: Alert, title: string, body: string, dismissable: boolean): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
            appBinding.showAlert(type, title, body, dismissable);
            resolve();
        });
    }

    static createNewProject (projectName: string, projectLocation: string, selectedTemplate: string, templateVersion: string, authorName: string, authorEmail: string, authorOrg: string, sourceRepo: string): Promise<void> {
        const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
        return appBinding.createNewProject(projectName, projectLocation, selectedTemplate, templateVersion, authorName, authorEmail, authorOrg, sourceRepo);
    }

    static openProject (projectLocation: string): Promise<void> {
        const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
        return appBinding.openProject(projectLocation);
    }

    static clearRecentProjects(): Promise<void> {
        const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
        return appBinding.clearRecentProjects();
    }

    static setShowOnStartup(showOnStartup: boolean): Promise<void> {
        const appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance();
        return appBinding.setShowOnStartup(showOnStartup);
    }

    static getKeyForAddress (keys: ProvenanceKey[], address: string): (ProvenanceKey | undefined) {
        return keys.find((key) => {
            return (key.address == address);
        });
    }

}

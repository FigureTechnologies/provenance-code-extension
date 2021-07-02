import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { BehaviorSubject, Observable } from 'rxjs';

import { ProvenanceAccountBalance } from './provenance-account-balance';
import { ProvenanceKey } from './provenance-key';
import { ProvenanceMarker, ProvenanceMarkerAccessControl } from './provenance-marker';

export interface EventData {
}

export enum Alert {
    Primary = 'primary',
    Secondary = 'secondary',
    Success = 'success',
    Danger = 'danger',
    Warning = 'warning',
    Info = 'info',
    Light = 'light',
    Dark = 'dark',
}

export enum Command {
    Ready = 'ready',
    DataChange = 'data-change',
    Alert = 'alert',
    ClearAlerts = 'clear-alerts',
    GetAccountBalancesRequest = 'get-account-balances-request',
    GetAccountBalancesResponse = 'get-account-balances-response',
    CreateKeyRequest = "create-key-request",
    CreateKeyResponse = "create-key-response",
    RecoverKeyRequest = "recover-key-request",
    RecoverKeyResponse = "recover-key-response",
    DeleteKeyRequest = "delete-key-request",
    DeleteKeyResponse = "delete-key-response",
    CreateMarkerRequest = "create-marker-request",
    CreateMarkerResponse = "create-marker-response",
    DeleteMarkerRequest = "delete-marker-request",
    DeleteMarkerResponse = "delete-marker-response",
    GrantMarkerPrivsRequest = "grant-marker-privs-request",
    GrantMarkerPrivsResponse = "grant-marker-privs-response",
    RevokeMarkerPrivsRequest = "revoke-marker-privs-request",
    RevokeMarkerPrivsResponse = "revoke-marker-privs-response",
    MintMarkerCoinsRequest = "mint-marker-coins-request",
    MintMarkerCoinsResponse = "mint-marker-coins-response",
    BurnMarkerCoinsRequest = "burn-marker-coins-request",
    BurnMarkerCoinsResponse = "burn-marker-coins-response",
    WithdrawMarkerCoinsRequest = "withdraw-marker-coins-request",
    WithdrawMarkerCoinsResponse = "withdraw-marker-coins-response",
    SendCoinRequest = "send-coin-request",
    SendCoinResponse = "send-coin-response"
}

export enum CommandResult {
    Success = 'success',
    Error = 'error'
}

export interface Event {
    command: Command,
    data: EventData | undefined
}

export enum DataBinding {
    Keys = 'keys',
    Markers = 'markers'
}

export interface AlertEvent extends EventData {
    id: string,
    type: Alert,
    title: string,
    body: string,
    dismissable: boolean
}

export interface DataChangeEvent extends EventData {
    name: DataBinding,
    value: any
}

export interface GetAccountBalancesRequestEvent extends EventData {
    id: string,
    addr: string
}

export interface GetAccountBalancesResponseEvent extends EventData {
    id: string,
    result: CommandResult,
    data: ProvenanceAccountBalance[],
    error: Error
}

export interface CreateKeyRequestEvent extends EventData {
    id: string,
    name: string
}

export interface CreateKeyResponseEvent extends EventData {
    id: string,
    result: CommandResult,
    data: (ProvenanceKey | undefined),
    error: Error
}

export interface RecoverKeyRequestEvent extends EventData {
    id: string,
    name: string,
    mnemonic: string
}

export interface RecoverKeyResponseEvent extends EventData {
    id: string,
    result: CommandResult,
    data: (ProvenanceKey | undefined),
    error: Error
}

export interface DeleteKeyRequestEvent extends EventData {
    id: string,
    name: string
}

export interface DeleteKeyResponseEvent extends EventData {
    id: string,
    result: CommandResult,
    error: Error
}

export interface CreateMarkerRequestEvent extends EventData {
    id: string,
    denom: string,
    supply: number,
    type: string,
    manager: string,
    access: ProvenanceMarkerAccessControl[]
}

export interface CreateMarkerResponseEvent extends EventData {
    id: string,
    result: CommandResult,
    data: (ProvenanceMarker | undefined),
    error: Error
}

export interface DeleteMarkerRequestEvent extends EventData {
    id: string,
    denom: string,
    from: string
}

export interface DeleteMarkerResponseEvent extends EventData {
    id: string,
    result: CommandResult,
    error: Error
}

export interface GrantMarkerPrivsRequestEvent extends EventData {
    id: string,
    denom: string,
    grants: ProvenanceMarkerAccessControl[],
    from: string
}

export interface GrantMarkerPrivsResponseEvent extends EventData {
    id: string,
    result: CommandResult,
    data: (ProvenanceMarker | undefined),
    error: Error
}

export interface RevokeMarkerPrivsRequestEvent extends EventData {
    id: string,
    denom: string,
    address: string,
    from: string
}

export interface RevokeMarkerPrivsResponseEvent extends EventData {
    id: string,
    result: CommandResult,
    data: (ProvenanceMarker | undefined),
    error: Error
}

export interface MintMarkerCoinsRequestEvent extends EventData {
    id: string,
    denom: string,
    amount: number,
    from: string
}

export interface MintMarkerCoinsResponseEvent extends EventData {
    id: string,
    result: CommandResult,
    data: (ProvenanceMarker | undefined),
    error: Error
}

export interface BurnMarkerCoinsRequestEvent extends EventData {
    id: string,
    denom: string,
    amount: number,
    from: string
}

export interface BurnMarkerCoinsResponseEvent extends EventData {
    id: string,
    result: CommandResult,
    data: (ProvenanceMarker | undefined),
    error: Error
}

export interface WithdrawMarkerCoinsRequestEvent extends EventData {
    id: string,
    denom: string,
    amount: number,
    to: string,
    from: string
}

export interface WithdrawMarkerCoinsResponseEvent extends EventData {
    id: string,
    result: CommandResult,
    data: (ProvenanceMarker | undefined),
    error: Error
}

export interface SendCoinRequestEvent extends EventData {
    id: string,
    denom: string,
    amount: number,
    to: string,
    from: string
}

export interface SendCoinResponseEvent extends EventData {
    id: string,
    result: CommandResult,
    data: (ProvenanceMarker | undefined),
    error: Error
}

export class ChainViewAppBinding {
    private static instance: ChainViewAppBinding;

    private _webview: (vscode.Webview | undefined) = undefined;
    private _vscode: any = undefined;

    public isReady: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    private _keys: BehaviorSubject<ProvenanceKey[]> = new BehaviorSubject<ProvenanceKey[]>([]);
    private _markers: BehaviorSubject<ProvenanceMarker[]> = new BehaviorSubject<ProvenanceMarker[]>([]);
    private _alerts: BehaviorSubject<AlertEvent[]> = new BehaviorSubject<AlertEvent[]>([]);

    private constructor() { }

    eventListener(event: any) {
        console.dir(event);
        if (event) {
            if (this._webview) {
                this.handleMessageFromReact(event as Event);
            } else {
                this.handleMessageFromCode(event.data as Event);
            }
        }
    }

    unready() {
        this.isReady.next(false);
    }

    waitForReady(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.isReady.value == true) {
                resolve();
            } else {
                const subscription = this.isReady.subscribe((isReady: boolean) => {
                    if (isReady) {
                        resolve();
                        subscription.unsubscribe();
                    }
                });
            }
        });
    }

    public clearAlerts() {
        if (this._webview) {
            let event: Event = {
                command: Command.ClearAlerts,
                data: undefined
            };
            this._webview.postMessage(event);
        }
    }

    public clearAlert(id: string) {
        if (this._vscode) {
            var newAlerts = this._alerts.value;
            var idx = newAlerts.findIndex((alert) => {
                return (alert.id == id);
            });
            if (idx >= 0) {
                newAlerts.splice(idx, 1);
            }
            this._alerts.next(newAlerts);
        }
    }

    public showAlert(type: Alert, title: string, body: string, dismissable: boolean) {
        let event: Event = {
            command: Command.Alert,
            data: {
                id: uuidv4(),
                type: type,
                title: title,
                body: body,
                dismissable: dismissable
            }
        };

        if (this._webview) {
            this._webview.postMessage(event);
        } else if (this._vscode) {
            const alertEvent: AlertEvent = event.data as AlertEvent;
            var newAlerts = this._alerts.value;
            newAlerts.push(alertEvent);
            this._alerts.next(newAlerts);
        }
    }

    private handleMessageFromReact(event: Event) {
        console.log('Handling message in code from react');
        switch (event.command) {
            case Command.Ready: {
                this.isReady.next(true);
            } break;

            case Command.GetAccountBalancesRequest: {
                const getActBalsReq = event.data as GetAccountBalancesRequestEvent;
                console.log(`Received request ${getActBalsReq.id} to get account balances for address ${getActBalsReq.addr}`);
                if (this.onGetAccountBalancesRequestHandler) {
                    this.onGetAccountBalancesRequestHandler(getActBalsReq.addr, (result: ProvenanceAccountBalance[]) => {
                        this.postGetAccountBalancesResponseEvent(getActBalsReq.id, CommandResult.Success, result, undefined);
                    }, (err: Error) => {
                        this.postGetAccountBalancesResponseEvent(getActBalsReq.id, CommandResult.Error, [], err);
                    });
                } else {
                    this.postGetAccountBalancesResponseEvent(getActBalsReq.id, CommandResult.Error, [], new Error('No request handler set.'));
                }
            } break;

            case Command.CreateKeyRequest: {
                const createKeyReq = event.data as CreateKeyRequestEvent;
                console.log(`Received request ${createKeyReq.id} to create key with name ${createKeyReq.name}`);
                if (this.onCreateKeyRequestHandler) {
                    this.onCreateKeyRequestHandler(createKeyReq.name, (result: ProvenanceKey) => {
                        this.postCreateKeyResponseEvent(createKeyReq.id, CommandResult.Success, result, undefined);
                    }, (err: Error) => {
                        this.postCreateKeyResponseEvent(createKeyReq.id, CommandResult.Error, undefined, err);
                    });
                } else {
                    this.postCreateKeyResponseEvent(createKeyReq.id, CommandResult.Error, undefined, new Error('No request handler set.'));
                }
            } break;

            case Command.RecoverKeyRequest: {
                const recoverKeyReq = event.data as RecoverKeyRequestEvent;
                console.log(`Received request ${recoverKeyReq.id} to recover key ${recoverKeyReq.name} with mnemonic ${recoverKeyReq.mnemonic}`);
                if (this.onRecoverKeyRequestHandler) {
                    this.onRecoverKeyRequestHandler(recoverKeyReq.name, recoverKeyReq.mnemonic, (result: ProvenanceKey) => {
                        this.postRecoverKeyResponseEvent(recoverKeyReq.id, CommandResult.Success, result, undefined);
                    }, (err: Error) => {
                        this.postRecoverKeyResponseEvent(recoverKeyReq.id, CommandResult.Error, undefined, err);
                    });
                } else {
                    this.postRecoverKeyResponseEvent(recoverKeyReq.id, CommandResult.Error, undefined, new Error('No request handler set.'));
                }
            } break;

            case Command.DeleteKeyRequest: {
                const deleteKeyReq = event.data as DeleteKeyRequestEvent;
                console.log(`Received request ${deleteKeyReq.id} to delete key ${deleteKeyReq.name}`);
                if (this.onDeleteKeyRequestHandler) {
                    this.onDeleteKeyRequestHandler(deleteKeyReq.name, () => {
                        this.postDeleteKeyResponseEvent(deleteKeyReq.id, CommandResult.Success, undefined);
                    }, (err: Error) => {
                        this.postDeleteKeyResponseEvent(deleteKeyReq.id, CommandResult.Error, err);
                    });
                } else {
                    this.postDeleteKeyResponseEvent(deleteKeyReq.id, CommandResult.Error, new Error('No request handler set.'));
                }
            } break;

            case Command.CreateMarkerRequest: {
                const createMarkerReq = event.data as CreateMarkerRequestEvent;
                console.log(`Received request ${createMarkerReq.id} to create marker with denom ${createMarkerReq.denom}`);
                if (this.onCreateMarkerRequestHandler) {
                    this.onCreateMarkerRequestHandler(createMarkerReq.denom, createMarkerReq.supply,createMarkerReq.type, createMarkerReq.manager, createMarkerReq.access, (result: ProvenanceMarker) => {
                        this.postCreateMarkerResponseEvent(createMarkerReq.id, CommandResult.Success, result, undefined);
                    }, (err: Error) => {
                        this.postCreateMarkerResponseEvent(createMarkerReq.id, CommandResult.Error, undefined, err);
                    });
                } else {
                    this.postCreateMarkerResponseEvent(createMarkerReq.id, CommandResult.Error, undefined, new Error('No request handler set.'));
                }
            } break;

            case Command.DeleteMarkerRequest: {
                const deleteMarkerReq = event.data as DeleteMarkerRequestEvent;
                console.log(`Received request ${deleteMarkerReq.id} to delete marker ${deleteMarkerReq.denom} from ${deleteMarkerReq.from}`);
                if (this.onDeleteMarkerRequestHandler) {
                    this.onDeleteMarkerRequestHandler(deleteMarkerReq.denom, deleteMarkerReq.from, () => {
                        this.postDeleteMarkerResponseEvent(deleteMarkerReq.id, CommandResult.Success, undefined);
                    }, (err: Error) => {
                        this.postDeleteMarkerResponseEvent(deleteMarkerReq.id, CommandResult.Error, err);
                    });
                } else {
                    this.postDeleteMarkerResponseEvent(deleteMarkerReq.id, CommandResult.Error, new Error('No request handler set.'));
                }
            } break;

            case Command.GrantMarkerPrivsRequest: {
                const grantMarkerPrivsReq = event.data as GrantMarkerPrivsRequestEvent;
                console.log(`Received request ${grantMarkerPrivsReq.id} to grant marker privs on ${grantMarkerPrivsReq.denom}`);
                if (this.onGrantMarkerPrivsRequestHandler) {
                    this.onGrantMarkerPrivsRequestHandler(grantMarkerPrivsReq.denom, grantMarkerPrivsReq.grants, grantMarkerPrivsReq.from, (result: ProvenanceMarker) => {
                        this.postGrantMarkerPrivsResponseEvent(grantMarkerPrivsReq.id, CommandResult.Success, result, undefined);
                    }, (err: Error) => {
                        this.postGrantMarkerPrivsResponseEvent(grantMarkerPrivsReq.id, CommandResult.Error, undefined, err);
                    });
                } else {
                    this.postGrantMarkerPrivsResponseEvent(grantMarkerPrivsReq.id, CommandResult.Error, undefined, new Error('No request handler set.'));
                }
            } break;

            case Command.RevokeMarkerPrivsRequest: {
                const revokeMarkerPrivsReq = event.data as RevokeMarkerPrivsRequestEvent;
                console.log(`Received request ${revokeMarkerPrivsReq.id} to revoke marker privs for ${revokeMarkerPrivsReq.address} on ${revokeMarkerPrivsReq.denom}`);
                if (this.onRevokeMarkerPrivsRequestHandler) {
                    this.onRevokeMarkerPrivsRequestHandler(revokeMarkerPrivsReq.denom, revokeMarkerPrivsReq.address, revokeMarkerPrivsReq.from, (result: ProvenanceMarker) => {
                        this.postRevokeMarkerPrivsResponseEvent(revokeMarkerPrivsReq.id, CommandResult.Success, result, undefined);
                    }, (err: Error) => {
                        this.postRevokeMarkerPrivsResponseEvent(revokeMarkerPrivsReq.id, CommandResult.Error, undefined, err);
                    });
                } else {
                    this.postRevokeMarkerPrivsResponseEvent(revokeMarkerPrivsReq.id, CommandResult.Error, undefined, new Error('No request handler set.'));
                }
            } break;

            case Command.MintMarkerCoinsRequest: {
                const mintMarkerCoinsReq = event.data as MintMarkerCoinsRequestEvent;
                console.log(`Received request ${mintMarkerCoinsReq.id} to mint ${mintMarkerCoinsReq.amount} marker coins for ${mintMarkerCoinsReq.denom}`);
                if (this.onMintMarkerCoinsRequestHandler) {
                    this.onMintMarkerCoinsRequestHandler(mintMarkerCoinsReq.denom, mintMarkerCoinsReq.amount, mintMarkerCoinsReq.from, () => {
                        this.postMintMarkerCoinsResponseEvent(mintMarkerCoinsReq.id, CommandResult.Success, undefined);
                    }, (err: Error) => {
                        this.postMintMarkerCoinsResponseEvent(mintMarkerCoinsReq.id, CommandResult.Error, err);
                    });
                } else {
                    this.postMintMarkerCoinsResponseEvent(mintMarkerCoinsReq.id, CommandResult.Error, new Error('No request handler set.'));
                }
            } break;

            case Command.BurnMarkerCoinsRequest: {
                const burnMarkerCoinsReq = event.data as BurnMarkerCoinsRequestEvent;
                console.log(`Received request ${burnMarkerCoinsReq.id} to burn ${burnMarkerCoinsReq.amount} marker coins for ${burnMarkerCoinsReq.denom}`);
                if (this.onBurnMarkerCoinsRequestHandler) {
                    this.onBurnMarkerCoinsRequestHandler(burnMarkerCoinsReq.denom, burnMarkerCoinsReq.amount, burnMarkerCoinsReq.from, () => {
                        this.postBurnMarkerCoinsResponseEvent(burnMarkerCoinsReq.id, CommandResult.Success, undefined);
                    }, (err: Error) => {
                        this.postBurnMarkerCoinsResponseEvent(burnMarkerCoinsReq.id, CommandResult.Error, err);
                    });
                } else {
                    this.postBurnMarkerCoinsResponseEvent(burnMarkerCoinsReq.id, CommandResult.Error, new Error('No request handler set.'));
                }
            } break;

            case Command.WithdrawMarkerCoinsRequest: {
                const withdrawMarkerCoinsReq = event.data as WithdrawMarkerCoinsRequestEvent;
                console.log(`Received request ${withdrawMarkerCoinsReq.id} to withdraw ${withdrawMarkerCoinsReq.amount} marker coins for ${withdrawMarkerCoinsReq.denom} to ${withdrawMarkerCoinsReq.to}`);
                if (this.onWithdrawMarkerCoinsRequestHandler) {
                    this.onWithdrawMarkerCoinsRequestHandler(withdrawMarkerCoinsReq.denom, withdrawMarkerCoinsReq.amount, withdrawMarkerCoinsReq.to, withdrawMarkerCoinsReq.from, () => {
                        this.postWithdrawMarkerCoinsResponseEvent(withdrawMarkerCoinsReq.id, CommandResult.Success, undefined);
                    }, (err: Error) => {
                        this.postWithdrawMarkerCoinsResponseEvent(withdrawMarkerCoinsReq.id, CommandResult.Error, err);
                    });
                } else {
                    this.postWithdrawMarkerCoinsResponseEvent(withdrawMarkerCoinsReq.id, CommandResult.Error, new Error('No request handler set.'));
                }
            } break;

            case Command.SendCoinRequest: {
                const sendCoinReq = event.data as SendCoinRequestEvent;
                console.log(`Received request ${sendCoinReq.id} to send ${sendCoinReq.amount} ${sendCoinReq.denom} coin to ${sendCoinReq.to}`);
                if (this.onSendCoinRequestHandler) {
                    this.onSendCoinRequestHandler(sendCoinReq.denom, sendCoinReq.amount, sendCoinReq.to, sendCoinReq.from, () => {
                        this.postSendCoinResponseEvent(sendCoinReq.id, CommandResult.Success, undefined);
                    }, (err: Error) => {
                        this.postSendCoinResponseEvent(sendCoinReq.id, CommandResult.Error, err);
                    });
                } else {
                    this.postSendCoinResponseEvent(sendCoinReq.id, CommandResult.Error, new Error('No request handler set.'));
                }
            } break;
        }
    }

    private handleMessageFromCode(event: Event) {
        console.log('Handling message in react from code');
        switch (event.command) {
            case Command.DataChange: {
                const dataChangeEvent: DataChangeEvent = event.data as DataChangeEvent;
                if(dataChangeEvent.name == DataBinding.Keys) {
                    this._keys.next(dataChangeEvent.value);
                } else if(dataChangeEvent.name == DataBinding.Markers) {
                    this._markers.next(dataChangeEvent.value);
                }
            } break;

            case Command.Alert: {
                const alertEvent: AlertEvent = event.data as AlertEvent;
                var newAlerts = this._alerts.value;
                newAlerts.push(alertEvent);
                this._alerts.next(newAlerts);
            } break;

            case Command.ClearAlerts: {
                this._alerts.next([]);
            } break;

            case Command.GetAccountBalancesResponse: {
                const getAccountBalancesResponseEvent: GetAccountBalancesResponseEvent = event.data as GetAccountBalancesResponseEvent;
                console.dir(getAccountBalancesResponseEvent);
                if (getAccountBalancesResponseEvent.id in this.responseHandlers) {
                    this.responseHandlers[getAccountBalancesResponseEvent.id](getAccountBalancesResponseEvent);
                }
            } break;

            case Command.CreateKeyResponse: {
                const createKeyResponseEvent: CreateKeyResponseEvent = event.data as CreateKeyResponseEvent;
                console.dir(createKeyResponseEvent);
                if (createKeyResponseEvent.id in this.responseHandlers) {
                    this.responseHandlers[createKeyResponseEvent.id](createKeyResponseEvent);
                }
            } break;

            case Command.RecoverKeyResponse: {
                const recoverKeyResponseEvent: RecoverKeyResponseEvent = event.data as RecoverKeyResponseEvent;
                console.dir(recoverKeyResponseEvent);
                if (recoverKeyResponseEvent.id in this.responseHandlers) {
                    this.responseHandlers[recoverKeyResponseEvent.id](recoverKeyResponseEvent);
                }
            } break;

            case Command.DeleteKeyResponse: {
                const deleteKeyResponseEvent: DeleteKeyResponseEvent = event.data as DeleteKeyResponseEvent;
                console.dir(deleteKeyResponseEvent);
                if (deleteKeyResponseEvent.id in this.responseHandlers) {
                    this.responseHandlers[deleteKeyResponseEvent.id](deleteKeyResponseEvent);
                }
            } break;

            case Command.CreateMarkerResponse: {
                const createMarkerResponseEvent: CreateMarkerResponseEvent = event.data as CreateMarkerResponseEvent;
                console.dir(createMarkerResponseEvent);
                if (createMarkerResponseEvent.id in this.responseHandlers) {
                    this.responseHandlers[createMarkerResponseEvent.id](createMarkerResponseEvent);
                }
            } break;

            case Command.DeleteMarkerResponse: {
                const deleteMarkerResponseEvent: DeleteMarkerResponseEvent = event.data as DeleteMarkerResponseEvent;
                console.dir(deleteMarkerResponseEvent);
                if (deleteMarkerResponseEvent.id in this.responseHandlers) {
                    this.responseHandlers[deleteMarkerResponseEvent.id](deleteMarkerResponseEvent);
                }
            } break;

            case Command.GrantMarkerPrivsResponse: {
                const grantMarkerPrivsResponseEvent: GrantMarkerPrivsResponseEvent = event.data as GrantMarkerPrivsResponseEvent;
                console.dir(grantMarkerPrivsResponseEvent);
                if (grantMarkerPrivsResponseEvent.id in this.responseHandlers) {
                    this.responseHandlers[grantMarkerPrivsResponseEvent.id](grantMarkerPrivsResponseEvent);
                }
            } break;

            case Command.RevokeMarkerPrivsResponse: {
                const revokeMarkerPrivsResponseEvent: RevokeMarkerPrivsResponseEvent = event.data as RevokeMarkerPrivsResponseEvent;
                console.dir(revokeMarkerPrivsResponseEvent);
                if (revokeMarkerPrivsResponseEvent.id in this.responseHandlers) {
                    this.responseHandlers[revokeMarkerPrivsResponseEvent.id](revokeMarkerPrivsResponseEvent);
                }
            } break;

            case Command.MintMarkerCoinsResponse: {
                const mintMarkerCoinsResponseEvent: MintMarkerCoinsResponseEvent = event.data as MintMarkerCoinsResponseEvent;
                console.dir(mintMarkerCoinsResponseEvent);
                if (mintMarkerCoinsResponseEvent.id in this.responseHandlers) {
                    this.responseHandlers[mintMarkerCoinsResponseEvent.id](mintMarkerCoinsResponseEvent);
                }
            } break;

            case Command.BurnMarkerCoinsResponse: {
                const burnMarkerCoinsResponseEvent: BurnMarkerCoinsResponseEvent = event.data as BurnMarkerCoinsResponseEvent;
                console.dir(burnMarkerCoinsResponseEvent);
                if (burnMarkerCoinsResponseEvent.id in this.responseHandlers) {
                    this.responseHandlers[burnMarkerCoinsResponseEvent.id](burnMarkerCoinsResponseEvent);
                }
            } break;

            case Command.WithdrawMarkerCoinsResponse: {
                const withdrawMarkerCoinsResponseEvent: WithdrawMarkerCoinsResponseEvent = event.data as WithdrawMarkerCoinsResponseEvent;
                console.dir(withdrawMarkerCoinsResponseEvent);
                if (withdrawMarkerCoinsResponseEvent.id in this.responseHandlers) {
                    this.responseHandlers[withdrawMarkerCoinsResponseEvent.id](withdrawMarkerCoinsResponseEvent);
                }
            } break;

            case Command.SendCoinResponse: {
                const sendCoinResponseEvent: SendCoinResponseEvent = event.data as SendCoinResponseEvent;
                console.dir(sendCoinResponseEvent);
                if (sendCoinResponseEvent.id in this.responseHandlers) {
                    this.responseHandlers[sendCoinResponseEvent.id](sendCoinResponseEvent);
                }
            } break;
        }
    }

    public set keys(keys: ProvenanceKey[]) {
        this._keys.next(keys);
        this.postDataChangeEvent(DataBinding.Keys, this._keys.value);
    }
    public get keys(): ProvenanceKey[] { return this._keys.value }
    public get keysObservable(): Observable<ProvenanceKey[]> { return this._keys }

    public set markers(markers: ProvenanceMarker[]) {
        this._markers.next(markers);
        this.postDataChangeEvent(DataBinding.Markers, this._markers.value);
    }
    public get markers(): ProvenanceMarker[] { return this._markers.value }
    public get markersObservable(): Observable<ProvenanceMarker[]> { return this._markers }

    public get alerts(): AlertEvent[] { return this._alerts.value }
    public get alertsObservable(): Observable<AlertEvent[]> { return this._alerts }

    onGetAccountBalancesRequest(handler: ((address: string, resolve: ((result: ProvenanceAccountBalance[]) => void), reject: ((err: Error) => void)) => void)) {
        this.onGetAccountBalancesRequestHandler = handler;
    }
    private onGetAccountBalancesRequestHandler: ((address: string, resolve: ((result: ProvenanceAccountBalance[]) => void), reject: ((err: Error) => void)) => void) | undefined = undefined;

    public getAccountBalances(address: string): Promise<ProvenanceAccountBalance[]> {
        return new Promise<ProvenanceAccountBalance[]>((resolve, reject) => {
            if (this._vscode) {
                const getAcctBalsReqData: GetAccountBalancesRequestEvent = {
                    id: uuidv4(),
                    addr: address
                };
                const getAcctBalsReqMessage: Event = {
                    command: Command.GetAccountBalancesRequest,
                    data: getAcctBalsReqData
                };
                this.registerResponse(getAcctBalsReqData.id, (eventData: EventData) => {
                    const getAcctBalsResMessage = eventData as GetAccountBalancesResponseEvent;
                    if (getAcctBalsResMessage.result == CommandResult.Success) {
                        resolve(getAcctBalsResMessage.data);
                    } else {
                        reject(getAcctBalsResMessage.error);
                    }
                });
                this._vscode.postMessage(getAcctBalsReqMessage);
            } else {
                reject(new Error('Cannot execute `getAccountBalances` from VSCode'));
            }
        });
    }

    onCreateKeyRequest(handler: ((name: string, resolve: ((result: ProvenanceKey) => void), reject: ((err: Error) => void)) => void)) {
        this.onCreateKeyRequestHandler = handler;
    }
    private onCreateKeyRequestHandler: ((name: string, resolve: ((result: ProvenanceKey) => void), reject: ((err: Error) => void)) => void) | undefined = undefined;

    public createKey(name: string): Promise<(ProvenanceKey | undefined)> {
        return new Promise<(ProvenanceKey | undefined)>((resolve, reject) => {
            if (this._vscode) {
                const createKeyReqData: CreateKeyRequestEvent = {
                    id: uuidv4(),
                    name: name
                };
                const createKeyReqMessage: Event = {
                    command: Command.CreateKeyRequest,
                    data: createKeyReqData
                };
                this.registerResponse(createKeyReqData.id, (eventData: EventData) => {
                    const createKeyResMessage = eventData as CreateKeyResponseEvent;
                    if (createKeyResMessage.result == CommandResult.Success) {
                        resolve(createKeyResMessage.data);
                    } else {
                        reject(createKeyResMessage.error);
                    }
                });
                this._vscode.postMessage(createKeyReqMessage);
            } else {
                reject(new Error('Cannot execute `createKey` from VSCode'));
            }
        });
    }

    onRecoverKeyRequest(handler: ((name: string, mnemonic: string, resolve: ((result: ProvenanceKey) => void), reject: ((err: Error) => void)) => void)) {
        this.onRecoverKeyRequestHandler = handler;
    }
    private onRecoverKeyRequestHandler: ((name: string, mnemonic: string, resolve: ((result: ProvenanceKey) => void), reject: ((err: Error) => void)) => void) | undefined = undefined;

    public recoverKey(name: string, mnemonic: string): Promise<(ProvenanceKey | undefined)> {
        return new Promise<(ProvenanceKey | undefined)>((resolve, reject) => {
            if (this._vscode) {
                const recoverKeyReqData: RecoverKeyRequestEvent = {
                    id: uuidv4(),
                    name: name,
                    mnemonic: mnemonic
                };
                const recoverKeyReqMessage: Event = {
                    command: Command.RecoverKeyRequest,
                    data: recoverKeyReqData
                };
                this.registerResponse(recoverKeyReqData.id, (eventData: EventData) => {
                    const recoverKeyResMessage = eventData as RecoverKeyResponseEvent;
                    if (recoverKeyResMessage.result == CommandResult.Success) {
                        resolve(recoverKeyResMessage.data);
                    } else {
                        reject(recoverKeyResMessage.error);
                    }
                });
                this._vscode.postMessage(recoverKeyReqMessage);
            } else {
                reject(new Error('Cannot execute `recoverKey` from VSCode'));
            }
        });
    }

    onDeleteKeyRequest(handler: ((name: string, resolve: (() => void), reject: ((err: Error) => void)) => void)) {
        this.onDeleteKeyRequestHandler = handler;
    }
    private onDeleteKeyRequestHandler: ((name: string, resolve: (() => void), reject: ((err: Error) => void)) => void) | undefined = undefined;

    public deleteKey(name: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._vscode) {
                const deleteKeyReqData: DeleteKeyRequestEvent = {
                    id: uuidv4(),
                    name: name
                };
                const deleteKeyReqMessage: Event = {
                    command: Command.DeleteKeyRequest,
                    data: deleteKeyReqData
                };
                this.registerResponse(deleteKeyReqData.id, (eventData: EventData) => {
                    const deleteKeyResMessage = eventData as DeleteKeyResponseEvent;
                    if (deleteKeyResMessage.result == CommandResult.Success) {
                        resolve();
                    } else {
                        reject(deleteKeyResMessage.error);
                    }
                });
                this._vscode.postMessage(deleteKeyReqMessage);
            } else {
                reject(new Error('Cannot execute `deleteKey` from VSCode'));
            }
        });
    }

    onCreateMarkerRequest(handler: ((denom: string, supply: number, type: string, manager: string, access: ProvenanceMarkerAccessControl[], resolve: ((result: ProvenanceMarker) => void), reject: ((err: Error) => void)) => void)) {
        this.onCreateMarkerRequestHandler = handler;
    }
    private onCreateMarkerRequestHandler: ((denom: string, supply: number, type: string, manager: string, access: ProvenanceMarkerAccessControl[], resolve: ((result: ProvenanceMarker) => void), reject: ((err: Error) => void)) => void) | undefined = undefined;

    public createMarker(denom: string, supply: number, type: string, manager: string, access: ProvenanceMarkerAccessControl[]): Promise<(ProvenanceMarker | undefined)> {
        return new Promise<(ProvenanceMarker | undefined)>((resolve, reject) => {
            if (this._vscode) {
                const createMarkerReqData: CreateMarkerRequestEvent = {
                    id: uuidv4(),
                    denom: denom,
                    supply: supply,
                    type: type,
                    manager: manager,
                    access: access
                };
                const createMarkerReqMessage: Event = {
                    command: Command.CreateMarkerRequest,
                    data: createMarkerReqData
                };
                this.registerResponse(createMarkerReqData.id, (eventData: EventData) => {
                    const createMarkerResMessage = eventData as CreateMarkerResponseEvent;
                    if (createMarkerResMessage.result == CommandResult.Success) {
                        resolve(createMarkerResMessage.data);
                    } else {
                        reject(createMarkerResMessage.error);
                    }
                });
                this._vscode.postMessage(createMarkerReqMessage);
            } else {
                reject(new Error('Cannot execute `createMarker` from VSCode'));
            }
        });
    }

    onDeleteMarkerRequest(handler: ((denom: string, from: string, resolve: (() => void), reject: ((err: Error) => void)) => void)) {
        this.onDeleteMarkerRequestHandler = handler;
    }
    private onDeleteMarkerRequestHandler: ((denom: string, from: string, resolve: (() => void), reject: ((err: Error) => void)) => void) | undefined = undefined;

    public deleteMarker(denom: string, from: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._vscode) {
                const deleteMarkerReqData: DeleteMarkerRequestEvent = {
                    id: uuidv4(),
                    denom: denom,
                    from: from
                };
                const deleteMarkerReqMessage: Event = {
                    command: Command.DeleteMarkerRequest,
                    data: deleteMarkerReqData
                };
                this.registerResponse(deleteMarkerReqData.id, (eventData: EventData) => {
                    const deleteMarkerResMessage = eventData as DeleteMarkerResponseEvent;
                    if (deleteMarkerResMessage.result == CommandResult.Success) {
                        resolve();
                    } else {
                        reject(deleteMarkerResMessage.error);
                    }
                });
                this._vscode.postMessage(deleteMarkerReqMessage);
            } else {
                reject(new Error('Cannot execute `deleteMarker` from VSCode'));
            }
        });
    }

    onGrantMarkerPrivsRequest(handler: ((denom: string, grants: ProvenanceMarkerAccessControl[], from: string,resolve: ((result: ProvenanceMarker) => void), reject: ((err: Error) => void)) => void)) {
        this.onGrantMarkerPrivsRequestHandler = handler;
    }
    private onGrantMarkerPrivsRequestHandler: ((denom: string, grants: ProvenanceMarkerAccessControl[], from: string,resolve: ((result: ProvenanceMarker) => void), reject: ((err: Error) => void)) => void) | undefined = undefined;

    public grantMarkerPrivs(denom: string, grants: ProvenanceMarkerAccessControl[], from: string): Promise<(ProvenanceMarker | undefined)> {
        return new Promise<(ProvenanceMarker | undefined)>((resolve, reject) => {
            if (this._vscode) {
                const grantMarkerPrivsReqData: GrantMarkerPrivsRequestEvent = {
                    id: uuidv4(),
                    denom: denom,
                    grants: grants,
                    from: from
                };
                const grantMarkerPrivsReqMessage: Event = {
                    command: Command.GrantMarkerPrivsRequest,
                    data: grantMarkerPrivsReqData
                };
                this.registerResponse(grantMarkerPrivsReqData.id, (eventData: EventData) => {
                    const grantMarkerPrivsResMessage = eventData as GrantMarkerPrivsResponseEvent;
                    if (grantMarkerPrivsResMessage.result == CommandResult.Success) {
                        resolve(grantMarkerPrivsResMessage.data);
                    } else {
                        reject(grantMarkerPrivsResMessage.error);
                    }
                });
                this._vscode.postMessage(grantMarkerPrivsReqMessage);
            } else {
                reject(new Error('Cannot execute `grantMarkerPrivs` from VSCode'));
            }
        });
    }

    onRevokeMarkerPrivsRequest(handler: ((denom: string, address: string, from: string,resolve: ((result: ProvenanceMarker) => void), reject: ((err: Error) => void)) => void)) {
        this.onRevokeMarkerPrivsRequestHandler = handler;
    }
    private onRevokeMarkerPrivsRequestHandler: ((denom: string, address: string, from: string,resolve: ((result: ProvenanceMarker) => void), reject: ((err: Error) => void)) => void) | undefined = undefined;

    public revokeMarkerPrivs(denom: string, address: string, from: string): Promise<(ProvenanceMarker | undefined)> {
        return new Promise<(ProvenanceMarker | undefined)>((resolve, reject) => {
            if (this._vscode) {
                const revokeMarkerPrivsReqData: RevokeMarkerPrivsRequestEvent = {
                    id: uuidv4(),
                    denom: denom,
                    address: address,
                    from: from
                };
                const revokeMarkerPrivsReqMessage: Event = {
                    command: Command.RevokeMarkerPrivsRequest,
                    data: revokeMarkerPrivsReqData
                };
                this.registerResponse(revokeMarkerPrivsReqData.id, (eventData: EventData) => {
                    const revokeMarkerPrivsResMessage = eventData as RevokeMarkerPrivsResponseEvent;
                    if (revokeMarkerPrivsResMessage.result == CommandResult.Success) {
                        resolve(revokeMarkerPrivsResMessage.data);
                    } else {
                        reject(revokeMarkerPrivsResMessage.error);
                    }
                });
                this._vscode.postMessage(revokeMarkerPrivsReqMessage);
            } else {
                reject(new Error('Cannot execute `revokeMarkerPrivs` from VSCode'));
            }
        });
    }

    onMintMarkerCoinsRequest(handler: ((denom: string, amount: number, from: string, resolve: (() => void), reject: ((err: Error) => void)) => void)) {
        this.onMintMarkerCoinsRequestHandler = handler;
    }
    private onMintMarkerCoinsRequestHandler: ((denom: string, amount: number, from: string, resolve: (() => void), reject: ((err: Error) => void)) => void) | undefined = undefined;

    public mintCoin (denom: string, amount: number, minter: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._vscode) {
                const mintMarkerCoinsReqData: MintMarkerCoinsRequestEvent = {
                    id: uuidv4(),
                    denom: denom,
                    amount: amount,
                    from: minter
                };
                const mintMarkerCoinsReqMessage: Event = {
                    command: Command.MintMarkerCoinsRequest,
                    data: mintMarkerCoinsReqData
                };
                this.registerResponse(mintMarkerCoinsReqData.id, (eventData: EventData) => {
                    const mintMarkerCoinsResMessage = eventData as MintMarkerCoinsResponseEvent;
                    if (mintMarkerCoinsResMessage.result == CommandResult.Success) {
                        resolve();
                    } else {
                        reject(mintMarkerCoinsResMessage.error);
                    }
                });
                this._vscode.postMessage(mintMarkerCoinsReqMessage);
            } else {
                reject(new Error('Cannot execute `mintCoin` from VSCode'));
            }
        });
    }
    
    onBurnMarkerCoinsRequest(handler: ((denom: string, amount: number, from: string, resolve: (() => void), reject: ((err: Error) => void)) => void)) {
        this.onBurnMarkerCoinsRequestHandler = handler;
    }
    private onBurnMarkerCoinsRequestHandler: ((denom: string, amount: number, from: string, resolve: (() => void), reject: ((err: Error) => void)) => void) | undefined = undefined;

    public burnCoin (denom: string, amount: number, burner: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._vscode) {
                const burnMarkerCoinsReqData: BurnMarkerCoinsRequestEvent = {
                    id: uuidv4(),
                    denom: denom,
                    amount: amount,
                    from: burner
                };
                const burnMarkerCoinsReqMessage: Event = {
                    command: Command.BurnMarkerCoinsRequest,
                    data: burnMarkerCoinsReqData
                };
                this.registerResponse(burnMarkerCoinsReqData.id, (eventData: EventData) => {
                    const burnMarkerCoinsResMessage = eventData as BurnMarkerCoinsResponseEvent;
                    if (burnMarkerCoinsResMessage.result == CommandResult.Success) {
                        resolve();
                    } else {
                        reject(burnMarkerCoinsResMessage.error);
                    }
                });
                this._vscode.postMessage(burnMarkerCoinsReqMessage);
            } else {
                reject(new Error('Cannot execute `burnCoin` from VSCode'));
            }
        });
    }

    onWithdrawMarkerCoinsRequest(handler: ((denom: string, amount: number, to: string, from: string, resolve: (() => void), reject: ((err: Error) => void)) => void)) {
        this.onWithdrawMarkerCoinsRequestHandler = handler;
    }
    private onWithdrawMarkerCoinsRequestHandler: ((denom: string, amount: number, to: string, from: string, resolve: (() => void), reject: ((err: Error) => void)) => void) | undefined = undefined;

    public withdrawCoin (denom: string, amount: number, address: string, signer: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._vscode) {
                const withdrawMarkerCoinsReqData: WithdrawMarkerCoinsRequestEvent = {
                    id: uuidv4(),
                    denom: denom,
                    to: address,
                    amount: amount,
                    from: signer
                };
                const withdrawMarkerCoinsReqMessage: Event = {
                    command: Command.WithdrawMarkerCoinsRequest,
                    data: withdrawMarkerCoinsReqData
                };
                this.registerResponse(withdrawMarkerCoinsReqData.id, (eventData: EventData) => {
                    const withdrawMarkerCoinsResMessage = eventData as WithdrawMarkerCoinsResponseEvent;
                    if (withdrawMarkerCoinsResMessage.result == CommandResult.Success) {
                        resolve();
                    } else {
                        reject(withdrawMarkerCoinsResMessage.error);
                    }
                });
                this._vscode.postMessage(withdrawMarkerCoinsReqMessage);
            } else {
                reject(new Error('Cannot execute `withdrawCoin` from VSCode'));
            }
        });
    }

    onSendCoinRequest(handler: ((denom: string, amount: number, to: string, from: string, resolve: (() => void), reject: ((err: Error) => void)) => void)) {
        this.onSendCoinRequestHandler = handler;
    }
    private onSendCoinRequestHandler: ((denom: string, amount: number, to: string, from: string, resolve: (() => void), reject: ((err: Error) => void)) => void) | undefined = undefined;

    public sendCoin (denom: string, amount: number, address: string, sender: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._vscode) {
                const sendCoinReqData: SendCoinRequestEvent = {
                    id: uuidv4(),
                    denom: denom,
                    to: address,
                    amount: amount,
                    from: sender
                };
                const sendCoinReqMessage: Event = {
                    command: Command.SendCoinRequest,
                    data: sendCoinReqData
                };
                this.registerResponse(sendCoinReqData.id, (eventData: EventData) => {
                    const sendCoinResMessage = eventData as SendCoinResponseEvent;
                    if (sendCoinResMessage.result == CommandResult.Success) {
                        resolve();
                    } else {
                        reject(sendCoinResMessage.error);
                    }
                });
                this._vscode.postMessage(sendCoinReqMessage);
            } else {
                reject(new Error('Cannot execute `sendCoin` from VSCode'));
            }
        });
    }

    public static getCodeInstance(webview: vscode.Webview): ChainViewAppBinding {
        if (!ChainViewAppBinding.instance) {
            ChainViewAppBinding.instance = new ChainViewAppBinding();
        }

        ChainViewAppBinding.instance._webview = webview;
        if (ChainViewAppBinding.instance._webview) {
            ChainViewAppBinding.instance._webview.onDidReceiveMessage((event: any) => {
                ChainViewAppBinding.instance.eventListener(event);
            });
        }

        return ChainViewAppBinding.instance;
    }

    public static getReactInstance(codevs: any = undefined): ChainViewAppBinding {
        if (!ChainViewAppBinding.instance) {
            ChainViewAppBinding.instance = new ChainViewAppBinding();
        }

        if (codevs) {
            ChainViewAppBinding.instance._vscode = codevs;
        }

        return ChainViewAppBinding.instance;
    }

    private registerResponse(id: string, handler: ((event: EventData) => void)) {
        this.responseHandlers[id] = handler;
    }
    private responseHandlers: {[k: string]: ((event: EventData) => void)} = {};

    // Event posting helpers VSCode -> React

    private postDataChangeEvent(binding: DataBinding, value: any) {
        if (this._webview) {
            let event: Event = {
                command: Command.DataChange,
                data: {
                    name: binding,
                    value: value
                }
            };
            this._webview.postMessage(event);
        }
    }

    private postGetAccountBalancesResponseEvent(id: string, result: CommandResult, data: ProvenanceAccountBalance[], error: (Error | undefined)) {
        if (this._webview) {
            let event: Event = {
                command: Command.GetAccountBalancesResponse,
                data: {
                    id: id,
                    result: result,
                    data: data,
                    error: error
                }
            };
            this._webview.postMessage(event);
        }
    }

    private postCreateKeyResponseEvent(id: string, result: CommandResult, data: (ProvenanceKey | undefined), error: (Error | undefined)) {
        if (this._webview) {
            let event: Event = {
                command: Command.CreateKeyResponse,
                data: {
                    id: id,
                    result: result,
                    data: data,
                    error: error
                }
            };
            this._webview.postMessage(event);
        }
    }

    private postRecoverKeyResponseEvent(id: string, result: CommandResult, data: (ProvenanceKey | undefined), error: (Error | undefined)) {
        if (this._webview) {
            let event: Event = {
                command: Command.RecoverKeyResponse,
                data: {
                    id: id,
                    result: result,
                    data: data,
                    error: error
                }
            };
            this._webview.postMessage(event);
        }
    }

    private postDeleteKeyResponseEvent(id: string, result: CommandResult, error: (Error | undefined)) {
        if (this._webview) {
            let event: Event = {
                command: Command.DeleteKeyResponse,
                data: {
                    id: id,
                    result: result,
                    error: error
                }
            };
            this._webview.postMessage(event);
        }
    }

    private postCreateMarkerResponseEvent(id: string, result: CommandResult, data: (ProvenanceMarker | undefined), error: (Error | undefined)) {
        if (this._webview) {
            let event: Event = {
                command: Command.CreateMarkerResponse,
                data: {
                    id: id,
                    result: result,
                    data: data,
                    error: error
                }
            };
            this._webview.postMessage(event);
        }
    }

    private postDeleteMarkerResponseEvent(id: string, result: CommandResult, error: (Error | undefined)) {
        if (this._webview) {
            let event: Event = {
                command: Command.DeleteMarkerResponse,
                data: {
                    id: id,
                    result: result,
                    error: error
                }
            };
            this._webview.postMessage(event);
        }
    }

    private postGrantMarkerPrivsResponseEvent(id: string, result: CommandResult, data: (ProvenanceMarker | undefined), error: (Error | undefined)) {
        if (this._webview) {
            let event: Event = {
                command: Command.GrantMarkerPrivsResponse,
                data: {
                    id: id,
                    result: result,
                    data: data,
                    error: error
                }
            };
            this._webview.postMessage(event);
        }
    }

    private postRevokeMarkerPrivsResponseEvent(id: string, result: CommandResult, data: (ProvenanceMarker | undefined), error: (Error | undefined)) {
        if (this._webview) {
            let event: Event = {
                command: Command.RevokeMarkerPrivsResponse,
                data: {
                    id: id,
                    result: result,
                    data: data,
                    error: error
                }
            };
            this._webview.postMessage(event);
        }
    }

    private postMintMarkerCoinsResponseEvent(id: string, result: CommandResult, error: (Error | undefined)) {
        if (this._webview) {
            let event: Event = {
                command: Command.MintMarkerCoinsResponse,
                data: {
                    id: id,
                    result: result,
                    error: error
                }
            };
            this._webview.postMessage(event);
        }
    }

    private postBurnMarkerCoinsResponseEvent(id: string, result: CommandResult, error: (Error | undefined)) {
        if (this._webview) {
            let event: Event = {
                command: Command.BurnMarkerCoinsResponse,
                data: {
                    id: id,
                    result: result,
                    error: error
                }
            };
            this._webview.postMessage(event);
        }
    }

    private postWithdrawMarkerCoinsResponseEvent(id: string, result: CommandResult, error: (Error | undefined)) {
        if (this._webview) {
            let event: Event = {
                command: Command.WithdrawMarkerCoinsResponse,
                data: {
                    id: id,
                    result: result,
                    error: error
                }
            };
            this._webview.postMessage(event);
        }
    }

    private postSendCoinResponseEvent(id: string, result: CommandResult, error: (Error | undefined)) {
        if (this._webview) {
            let event: Event = {
                command: Command.SendCoinResponse,
                data: {
                    id: id,
                    result: result,
                    error: error
                }
            };
            this._webview.postMessage(event);
        }
    }

}

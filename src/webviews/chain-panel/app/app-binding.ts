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
    CreateMarkerResponse = "create-marker-response"
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

export enum GetAccountBalancesResult {
    Success = 'success',
    Error = 'error'
}

export interface GetAccountBalancesRequestEvent extends EventData {
    id: string,
    addr: string
}

export interface GetAccountBalancesResponseEvent extends EventData {
    id: string,
    result: GetAccountBalancesResult,
    data: ProvenanceAccountBalance[],
    error: Error
}

export enum CreateKeyResult {
    Success = 'success',
    Error = 'error'
}

export interface CreateKeyRequestEvent extends EventData {
    id: string,
    name: string
}

export interface CreateKeyResponseEvent extends EventData {
    id: string,
    result: CreateKeyResult,
    data: (ProvenanceKey | undefined),
    error: Error
}

export enum RecoverKeyResult {
    Success = 'success',
    Error = 'error'
}

export interface RecoverKeyRequestEvent extends EventData {
    id: string,
    name: string,
    mnemonic: string
}

export interface RecoverKeyResponseEvent extends EventData {
    id: string,
    result: RecoverKeyResult,
    data: (ProvenanceKey | undefined),
    error: Error
}

export enum DeleteKeyResult {
    Success = 'success',
    Error = 'error'
}

export interface DeleteKeyRequestEvent extends EventData {
    id: string,
    name: string
}

export interface DeleteKeyResponseEvent extends EventData {
    id: string,
    result: DeleteKeyResult,
    error: Error
}

export enum CreateMarkerResult {
    Success = 'success',
    Error = 'error'
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
    result: CreateMarkerResult,
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
                        this.postGetAccountBalancesResponseEvent(getActBalsReq.id, GetAccountBalancesResult.Success, result, undefined);
                    }, (err: Error) => {
                        this.postGetAccountBalancesResponseEvent(getActBalsReq.id, GetAccountBalancesResult.Error, [], err);
                    });
                } else {
                    this.postGetAccountBalancesResponseEvent(getActBalsReq.id, GetAccountBalancesResult.Error, [], new Error('No request handler set.'));
                }
            } break;

            case Command.CreateKeyRequest: {
                const createKeyReq = event.data as CreateKeyRequestEvent;
                console.log(`Received request ${createKeyReq.id} to create key with name ${createKeyReq.name}`);
                if (this.onCreateKeyRequestHandler) {
                    this.onCreateKeyRequestHandler(createKeyReq.name, (result: ProvenanceKey) => {
                        this.postCreateKeyResponseEvent(createKeyReq.id, CreateKeyResult.Success, result, undefined);
                    }, (err: Error) => {
                        this.postCreateKeyResponseEvent(createKeyReq.id, CreateKeyResult.Error, undefined, err);
                    });
                } else {
                    this.postCreateKeyResponseEvent(createKeyReq.id, CreateKeyResult.Error, undefined, new Error('No request handler set.'));
                }
            } break;

            case Command.RecoverKeyRequest: {
                const recoverKeyReq = event.data as RecoverKeyRequestEvent;
                console.log(`Received request ${recoverKeyReq.id} to recover key ${recoverKeyReq.name} with mnemonic ${recoverKeyReq.mnemonic}`);
                if (this.onRecoverKeyRequestHandler) {
                    this.onRecoverKeyRequestHandler(recoverKeyReq.name, recoverKeyReq.mnemonic, (result: ProvenanceKey) => {
                        this.postRecoverKeyResponseEvent(recoverKeyReq.id, RecoverKeyResult.Success, result, undefined);
                    }, (err: Error) => {
                        this.postRecoverKeyResponseEvent(recoverKeyReq.id, RecoverKeyResult.Error, undefined, err);
                    });
                } else {
                    this.postRecoverKeyResponseEvent(recoverKeyReq.id, RecoverKeyResult.Error, undefined, new Error('No request handler set.'));
                }
            } break;

            case Command.DeleteKeyRequest: {
                const deleteKeyReq = event.data as DeleteKeyRequestEvent;
                console.log(`Received request ${deleteKeyReq.id} to delete key ${deleteKeyReq.name}`);
                if (this.onDeleteKeyRequestHandler) {
                    this.onDeleteKeyRequestHandler(deleteKeyReq.name, () => {
                        this.postDeleteKeyResponseEvent(deleteKeyReq.id, DeleteKeyResult.Success, undefined);
                    }, (err: Error) => {
                        this.postDeleteKeyResponseEvent(deleteKeyReq.id, DeleteKeyResult.Error, err);
                    });
                } else {
                    this.postDeleteKeyResponseEvent(deleteKeyReq.id, DeleteKeyResult.Error, new Error('No request handler set.'));
                }
            } break;

            case Command.CreateMarkerRequest: {
                const createMarkerReq = event.data as CreateMarkerRequestEvent;
                console.log(`Received request ${createMarkerReq.id} to create marker with denom ${createMarkerReq.denom}`);
                if (this.onCreateMarkerRequestHandler) {
                    this.onCreateMarkerRequestHandler(createMarkerReq.denom, createMarkerReq.supply,createMarkerReq.type, createMarkerReq.manager, createMarkerReq.access, (result: ProvenanceMarker) => {
                        this.postCreateMarkerResponseEvent(createMarkerReq.id, CreateMarkerResult.Success, result, undefined);
                    }, (err: Error) => {
                        this.postCreateMarkerResponseEvent(createMarkerReq.id, CreateMarkerResult.Error, undefined, err);
                    });
                } else {
                    this.postCreateMarkerResponseEvent(createMarkerReq.id, CreateMarkerResult.Error, undefined, new Error('No request handler set.'));
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
                    if (getAcctBalsResMessage.result == GetAccountBalancesResult.Success) {
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
                    if (createKeyResMessage.result == CreateKeyResult.Success) {
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
                    if (recoverKeyResMessage.result == RecoverKeyResult.Success) {
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
                    if (deleteKeyResMessage.result == DeleteKeyResult.Success) {
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
                    if (createMarkerResMessage.result == CreateMarkerResult.Success) {
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

    private postGetAccountBalancesResponseEvent(id: string, result: GetAccountBalancesResult, data: ProvenanceAccountBalance[], error: (Error | undefined)) {
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

    private postCreateKeyResponseEvent(id: string, result: CreateKeyResult, data: (ProvenanceKey | undefined), error: (Error | undefined)) {
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

    private postRecoverKeyResponseEvent(id: string, result: RecoverKeyResult, data: (ProvenanceKey | undefined), error: (Error | undefined)) {
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

    private postDeleteKeyResponseEvent(id: string, result: DeleteKeyResult, error: (Error | undefined)) {
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

    private postCreateMarkerResponseEvent(id: string, result: CreateMarkerResult, data: (ProvenanceMarker | undefined), error: (Error | undefined)) {
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

}

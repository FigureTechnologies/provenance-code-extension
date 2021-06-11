import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { BehaviorSubject, Observable } from 'rxjs';

import { ProvenanceAccountBalance } from './provenance-account-balance';
import { ProvenanceKey } from './provenance-key';

export interface EventData {
}

export enum Command {
    Ready = 'ready',
    DataChange = 'data-change',
    GetAccountBalancesRequest = 'get-account-balances-request',
    GetAccountBalancesResponse = 'get-account-balances-response',
    CreateKeyRequest = "create-key-request",
    CreateKeyResponse = "create-key-response"
}

export interface Event {
    command: Command,
    data: EventData | undefined
}

export enum DataBinding {
    Keys = 'keys'
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

export class ChainViewAppBinding {
    private static instance: ChainViewAppBinding;

    private _webview: (vscode.Webview | undefined) = undefined;
    private _vscode: any = undefined;

    public isReady: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    private _keys: BehaviorSubject<ProvenanceKey[]> = new BehaviorSubject<ProvenanceKey[]>([]);

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
        }
    }

    private handleMessageFromCode(event: Event) {
        console.log('Handling message in react from code');
        switch (event.command) {
            case Command.DataChange: {
                const dataChangeEvent: DataChangeEvent = event.data as DataChangeEvent;
                if(dataChangeEvent.name == DataBinding.Keys) {
                    this._keys.next(dataChangeEvent.value);
                }
            } break;

            case Command.GetAccountBalancesResponse: {
                const getAccountBalancesResponseEvent: GetAccountBalancesResponseEvent = event.data as GetAccountBalancesResponseEvent;
                console.dir(getAccountBalancesResponseEvent);
                if (getAccountBalancesResponseEvent.id in this.responseHandlers) {
                    this.responseHandlers[getAccountBalancesResponseEvent.id](getAccountBalancesResponseEvent);
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

    public createMarker(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._vscode) {
                // TODO
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

}

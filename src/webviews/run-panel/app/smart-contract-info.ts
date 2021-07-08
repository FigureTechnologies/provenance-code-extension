import { SmartContractFunction, SmartContractFunctionType } from './smart-contract-function';

export interface SmartContractInfo {
    name: string,
    source: string,
    address: string,
    codeId: number,
    latestCodeId: number,
    isSingleton: boolean,
    initFunction: SmartContractFunction,
    defaultInitArgs: any
}

export const EmptySmartContractInfo: SmartContractInfo = {
    name: '',
    source: '',
    address: '',
    codeId: 0,
    latestCodeId: 0,
    isSingleton: true,
    initFunction: {
        name: 'instantiate',
        type: SmartContractFunctionType.Instantiate,
        properties: []
    },
    defaultInitArgs: undefined
};

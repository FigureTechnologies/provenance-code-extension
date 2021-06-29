import { SmartContractFunction, SmartContractFunctionType } from './smart-contract-function';

export interface SmartContractInfo {
    name: string,
    address: string,
    codeId: number,
    isSingleton: boolean,
    initFunction: SmartContractFunction
}

export const EmptySmartContractInfo: SmartContractInfo = {
    name: '',
    address: '',
    codeId: 0,
    isSingleton: true,
    initFunction: {
        name: 'instantiate',
        type: SmartContractFunctionType.Instantiate,
        properties: []
    }
};

export enum SmartContractFunctionType {
    Execute = 'execute',
    Instantiate = 'instantiate',
    Query = 'query'
}

export interface SmartContractFunctionProperty {
    name: string,
    type: string,
    required: boolean,
    items: string,
    properties: SmartContractFunctionProperty[]
}

export interface SmartContractFunction {
    name: string,
    type: SmartContractFunctionType,
    properties: SmartContractFunctionProperty[]
}

export const EmptySmartContractFunction: SmartContractFunction = {
    name: '',
    type: SmartContractFunctionType.Instantiate,
    properties: []
};

export interface SmartContractFunctions {
    instantiateFunction: SmartContractFunction,
    executeFunctions: SmartContractFunction[],
    queryFunctions: SmartContractFunction[]
}

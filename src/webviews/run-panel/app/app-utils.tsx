import { RunViewAppBinding } from './app-binding';
import { SmartContractInfo } from './smart-contract-info';
import { SmartContractFunction, SmartContractFunctionType } from "./smart-contract-function";

export interface Coin {
    denom: string,
    amount: number
}

export class Utils {

    static snakeToCamel (snakeCaseString: string) {
        return snakeCaseString.replace(/([-_]\w)/g, g => g[1].toUpperCase());
    }

    static snakeToTitle (snakeCaseString: string) {
        const camel = Utils.snakeToCamel(snakeCaseString);
        return camel.charAt(0).toUpperCase() + camel.slice(1);
    }

    static instantiateContract (contract: SmartContractInfo, args: any, key: (string | undefined)): Promise<any> {
        const appBinding: RunViewAppBinding = RunViewAppBinding.getReactInstance();
        return appBinding.instantiateContract(contract, args, key);
    }

    static runFunction (func: SmartContractFunction, args: any, addr: (string | undefined), key: (string | undefined), coin: (Coin | undefined)): Promise<any> {
        switch (func.type) {
            case SmartContractFunctionType.Execute: {
                if (addr) {
                    if (key) {
                        if (coin) {
                            return Utils.executeInstanceAsWithCoin(addr, func, args, key, coin);
                        } else {
                            return Utils.executeInstanceAs(addr, func, args, key);
                        }
                    } else {
                        if (coin) {
                            return Utils.executeInstanceWithCoin(addr, func, args, coin);
                        } else {
                            return Utils.executeInstance(addr, func, args);
                        }
                    }
                } else {
                    if (key) {
                        if (coin) {
                            return Utils.executeAsWithCoin(func, args, key, coin);
                        } else {
                            return Utils.executeAs(func, args, key);
                        }
                    } else {
                        if (coin) {
                            return Utils.executeWithCoin(func, args, coin);
                        } else {
                            return Utils.execute(func, args);
                        }
                    }
                }
            }

            case SmartContractFunctionType.Query: {
                if (addr) {
                    return Utils.queryInstance(addr, func, args);
                } else {
                    return Utils.query(func, args);
                }
            }

            default: {
                return new Promise<any>((resolve, reject) => {
                    reject(new Error('Invalid smart contract function type'));
                });
            }
        }
    }

    static execute (func: SmartContractFunction, args: any): Promise<any> {
        const appBinding: RunViewAppBinding = RunViewAppBinding.getReactInstance();
        return appBinding.executeFunction(func, args);
    }

    static executeInstance (addr: string, func: SmartContractFunction, args: any): Promise<any> {
        const appBinding: RunViewAppBinding = RunViewAppBinding.getReactInstance();
        return appBinding.executeFunctionInstance(addr, func, args);
    }

    static executeWithCoin (func: SmartContractFunction, args: any, coin: Coin): Promise<any> {
        const appBinding: RunViewAppBinding = RunViewAppBinding.getReactInstance();
        return appBinding.executeFunctionWithCoin(func, args, coin.amount, coin.denom);
    }

    static executeInstanceWithCoin (addr: string, func: SmartContractFunction, args: any, coin: Coin): Promise<any> {
        const appBinding: RunViewAppBinding = RunViewAppBinding.getReactInstance();
        return appBinding.executeFunctionInstanceWithCoin(addr, func, args, coin.amount, coin.denom);
    }

    static executeAs (func: SmartContractFunction, args: any, key: string): Promise<any> {
        const appBinding: RunViewAppBinding = RunViewAppBinding.getReactInstance();
        return appBinding.executeFunctionAs(func, args, key);
    }

    static executeInstanceAs (addr: string, func: SmartContractFunction, args: any, key: string): Promise<any> {
        const appBinding: RunViewAppBinding = RunViewAppBinding.getReactInstance();
        return appBinding.executeFunctionInstanceAs(addr, func, args, key);
    }

    static executeAsWithCoin (func: SmartContractFunction, args: any, key: string, coin: Coin): Promise<any> {
        const appBinding: RunViewAppBinding = RunViewAppBinding.getReactInstance();
        return appBinding.executeFunctionAsWithCoin(func, args, key, coin.amount, coin.denom);
    }

    static executeInstanceAsWithCoin (addr: string, func: SmartContractFunction, args: any, key: string, coin: Coin): Promise<any> {
        const appBinding: RunViewAppBinding = RunViewAppBinding.getReactInstance();
        return appBinding.executeFunctionInstanceAsWithCoin(addr, func, args, key, coin.amount, coin.denom);
    }

    static query (func: SmartContractFunction, args: any): Promise<any> {
        const appBinding: RunViewAppBinding = RunViewAppBinding.getReactInstance();
        return appBinding.queryFunction(func, args);
    }

    static queryInstance (addr: string, func: SmartContractFunction, args: any): Promise<any> {
        const appBinding: RunViewAppBinding = RunViewAppBinding.getReactInstance();
        return appBinding.queryFunctionInstance(addr, func, args);
    }

    static migrateContract (addr: string, codeId: number): Promise<void> {
        const appBinding: RunViewAppBinding = RunViewAppBinding.getReactInstance();
        return appBinding.migrateContract(addr, codeId);
    }

}

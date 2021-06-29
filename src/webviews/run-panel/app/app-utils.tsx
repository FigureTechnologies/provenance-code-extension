import { RunViewAppBinding } from './app-binding';
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

    static runFunction (func: SmartContractFunction, args: any, key: (string | undefined), coin: (Coin | undefined)): Promise<any> {
        switch (func.type) {
            case SmartContractFunctionType.Execute: {
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

            case SmartContractFunctionType.Query: {
                return Utils.query(func, args);
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

    static executeWithCoin (func: SmartContractFunction, args: any, coin: Coin): Promise<any> {
        const appBinding: RunViewAppBinding = RunViewAppBinding.getReactInstance();
        return appBinding.executeFunctionWithCoin(func, args, coin.amount, coin.denom);
    }

    static executeAs (func: SmartContractFunction, args: any, key: string): Promise<any> {
        const appBinding: RunViewAppBinding = RunViewAppBinding.getReactInstance();
        return appBinding.executeFunctionAs(func, args, key);
    }

    static executeAsWithCoin (func: SmartContractFunction, args: any, key: string, coin: Coin): Promise<any> {
        const appBinding: RunViewAppBinding = RunViewAppBinding.getReactInstance();
        return appBinding.executeFunctionAsWithCoin(func, args, key, coin.amount, coin.denom);
    }

    static query (func: SmartContractFunction, args: any): Promise<any> {
        const appBinding: RunViewAppBinding = RunViewAppBinding.getReactInstance();
        return appBinding.queryFunction(func, args);
    }

}

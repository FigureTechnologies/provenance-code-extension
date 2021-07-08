import { Provenance } from './ProvenanceClient';

export class ArgParser {
    static async resolveArg(provenance: Provenance, arg: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const call = arg.split("::");
            const ns = call[0];
            var args = call[1].split(/[(,) ]+/);
            const func = args[0];
            args.shift();
            args.pop();
    
            if (ns == 'provenance') {
                if (func == 'getAddressForKey') {
                    // TODO: ensure # args is correct
                    resolve(provenance.getAddressForKey(args[0]));
                } else if (func == 'getMarkerAddress') {
                    // TODO: ensure # args is correct
                    resolve(provenance.getMarkerAddress(args[0]));
                } else {
                    reject(new Error(`Unknown function ${func} in namespace ${ns}`));
                }
            } else {
                reject(new Error(`Unknown namespace ${ns}`));
            }
        });
    }

    static async generateInitArgs(provenance: Provenance, args: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            var initArgs: {[k: string]: any} = {};
    
            Object.keys(args).forEach(async function (key) {
                if (typeof args[key] == 'string') {
                    if (args[key].startsWith('${') && args[key].endsWith('}')) {
                        initArgs[key] = await ArgParser.resolveArg(provenance, args[key].slice(2, -1));
                    } else {
                        initArgs[key] = args[key];
                    }
                } else if (Array.isArray(args[key])) {
                    initArgs[key] = [];
                    args[key].forEach(async (value: any) => {
                        if (typeof value == 'string') {
                            if (value.startsWith('${') && value.endsWith('}')) {
                                initArgs[key].push(await ArgParser.resolveArg(provenance, value.slice(2, -1)));
                            } else {
                                initArgs[key].push(value);
                            }
                        } else if (typeof value == 'object') {
                            initArgs[key].push(await ArgParser.generateInitArgs(provenance, value));
                        } else {
                            initArgs[key].push(value);
                        }
                    });
                } else if (typeof args[key] == 'object') {
                    initArgs[key] = await ArgParser.generateInitArgs(provenance, args[key]);
                } else {
                    initArgs[key] = args[key];
                }
            });
    
            resolve(initArgs);
        });
    }
}

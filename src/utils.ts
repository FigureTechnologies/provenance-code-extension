import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import { URL } from 'url';
import SimpleGit, { RemoteWithRefs } from 'simple-git';

import { Contract, Provenance, ProvenanceConfig } from './ProvenanceClient'

import { SmartContractFunction, SmartContractFunctionProperty, SmartContractFunctionType, SmartContractFunctions } from './webviews/run-panel/app/smart-contract-function';

class JSONSchemaSmartContractFunctionProperty implements SmartContractFunctionProperty {
    name: string = '';
    type: string = '';
    required: boolean = false;
    items: string = '';
    properties: SmartContractFunctionProperty[] = [];

    constructor(jsonSchema: any) {
        this.type = jsonSchema.type;
        if (this.type == 'object') {
            this.properties = JSONSchemaSmartContractFunctionProperty.parseObjectProperties(jsonSchema.properties);
        } else if (this.type == 'array') {
            this.items = jsonSchema.items.type;
        }
    }

    static parseObjectProperties(jsonSchema: any): JSONSchemaSmartContractFunctionProperty[] {
        var props: JSONSchemaSmartContractFunctionProperty[] = [];

        for (const key in jsonSchema.properties) {
            var prop = new JSONSchemaSmartContractFunctionProperty(jsonSchema.properties[key]);
            prop.name = key;
            prop.required = (jsonSchema.required && jsonSchema.required.includes(key));

            props.push(prop);
        }

        return props;
    }
}

class JSONSchemaSmartContractFunction implements SmartContractFunction {
    name: string = '';
    type: SmartContractFunctionType = SmartContractFunctionType.Execute;
    properties: SmartContractFunctionProperty[] = [];

    constructor(jsonSchema: any, funcType: SmartContractFunctionType) {
        this.name = jsonSchema.required[0];
        this.type = funcType;
        const args = jsonSchema.properties[jsonSchema.required[0]];
        if (args) {
            this.properties = JSONSchemaSmartContractFunctionProperty.parseObjectProperties(args);
        }
    }
}

class ObjectSmartContractFunctionProperty implements SmartContractFunctionProperty {
    name: string = '';
    type: string = '';
    required: boolean = false;
    items: string = '';
    properties: SmartContractFunctionProperty[] = [];

    constructor(name: string, type: string, required: boolean, items: string, properties: SmartContractFunctionProperty[]) {
        this.name = name;
        this.type = type;
        this.required = required;
        this.items = items;
        this.properties = properties;
    }

    static parseObjectProperties(obj: any): ObjectSmartContractFunctionProperty[] {
        var props: ObjectSmartContractFunctionProperty[] = [];

        for (let [key, value] of Object.entries(obj)) {
            console.log(`${key} is ${typeof value}`);
            switch (typeof value) {
                case 'string': {
                    props.push(new ObjectSmartContractFunctionProperty(key, 'string', true, '', []));
                } break;

                case 'number': {
                    props.push(new ObjectSmartContractFunctionProperty(key, 'number', true, '', []));
                } break;

                case 'object': {
                    props.push(new ObjectSmartContractFunctionProperty(key, 'object', true, '', ObjectSmartContractFunctionProperty.parseObjectProperties(value) as SmartContractFunctionProperty[]));
                } break;

                case 'boolean': {
                    props.push(new ObjectSmartContractFunctionProperty(key, 'boolean', true, '', []));
                } break;
            }
        };

        return props;
    }
}

class ObjectSmartContractFunction implements SmartContractFunction {
    name: string = '';
    type: SmartContractFunctionType = SmartContractFunctionType.Execute;
    properties: SmartContractFunctionProperty[] = [];

    constructor(obj: any, funcName: string, funcType: SmartContractFunctionType) {
        this.name = funcName;
        this.type = funcType;
        this.properties = ObjectSmartContractFunctionProperty.parseObjectProperties(obj) as SmartContractFunctionProperty[];
    }
}

const TERMINAL_NAME = "provenanced";

let OutputChannel: (vscode.OutputChannel | null) = null;

export class Utils {

    static getTerminal(pathToProvenancedBin: string): vscode.Terminal {
        var terminal = null;
        vscode.window.terminals.forEach((term: vscode.Terminal) => {
            if (term.name == TERMINAL_NAME) {
                terminal = term;
            }
        });
        if (terminal == null) {
            const clientBinaryDir = path.dirname(pathToProvenancedBin);

            let envVars: any = process.env;
            if (clientBinaryDir && !envVars.PATH.includes(`:${clientBinaryDir}`)) {
                envVars.PATH = `${envVars.PATH}:${clientBinaryDir}`
            }
            console.log(`PATH=${envVars.PATH}`)

            terminal = vscode.window.createTerminal({
                cwd: Utils.getWorkspaceFolder(),
                env: envVars,
                name: TERMINAL_NAME
            });
        }

        terminal.show();

        return terminal;
    }

    static getConsole(): vscode.OutputChannel {
        if (OutputChannel == null) {
            OutputChannel = vscode.window.createOutputChannel("Provenance");
        }
        OutputChannel.show();
        return OutputChannel;
    }

    static getWorkspaceFolder(): string {
        let folder = "";

        if (vscode.workspace.workspaceFolders !== undefined) {
            folder = vscode.workspace.workspaceFolders[0].uri.fsPath; 
        }

        return folder;
    }

    static runCommand(command: string, stdout: (((data:string) => void) | undefined) = undefined, stderr: (((data:string) => void) | undefined) = undefined, cwd: (string | undefined) = undefined): Promise<void> {
        return Utils.runCommandWithArray(command.split(' '), stdout, stderr, cwd);
    }

    static runCommandWithArray(command: string[], stdout: (((data:string) => void) | undefined) = undefined, stderr: (((data:string) => void) | undefined) = undefined, cwd: (string | undefined) = undefined): Promise<void> {
        var cmd = command[0];
        command.shift();

        const promise = new Promise<void>((resolve, reject) => {
            const proc = child_process.spawn(cmd, command, { cwd: (cwd == undefined ? Utils.getWorkspaceFolder() : cwd) });
    
            var provConsole = Utils.getConsole();
    
            provConsole.appendLine(`> ${cmd} ${command.join(' ')}`);
    
            proc.stdout.on('data', (data: any) => {
                provConsole.appendLine(data);
                if (stdout != undefined) {
                    stdout(data);
                }
            });
            
            proc.stderr.on('data', (data: any) => {
                provConsole.appendLine(data);
                if (stderr != undefined) {
                    stderr(data);
                }
            });
    
            proc.on('error', (err: Error) => {
                provConsole.appendLine(`Failed to start process: ${cmd}`);
                reject(new Error(`Failed to start process: ${cmd}`));
            });
            
            proc.on('close', (code: number) => {
                provConsole.appendLine(`child process exited with code ${code}`);
                if (code == 0) {
                    resolve();
                } else {
                    reject(new Error(`Process exited with code: ${code}`));
                }
            });
        });
    
        return promise;
    }

    static loadProvenanceConfig(): Promise<ProvenanceConfig> {
        const promise = new Promise<ProvenanceConfig>((resolve, reject) => {
            vscode.workspace.findFiles('provenance-config.json', '/', 1).then((foundFiles: vscode.Uri[]) => {
                if (foundFiles && foundFiles.length > 0) {
                    vscode.workspace.openTextDocument(foundFiles[0]).then((provConfigDoc) => {
                        let projectConfig: ProvenanceConfig = JSON.parse(provConfigDoc.getText());
                        // TODO: validate projectConfig???
                        resolve(projectConfig);
                    });
                } else {
                    reject(new Error("Workspace does not contain a 'provenance-config.json' file."));
                }
            });
        });
        
        return promise;
    }

    static snakeToCamel (snakeCaseString: string) {
        return snakeCaseString.replace(/([-_]\w)/g, g => g[1].toUpperCase());
    }

    static snakeToTitle (snakeCaseString: string) {
        const camel = Utils.snakeToCamel(snakeCaseString);
        return camel.charAt(0).toUpperCase() + camel.slice(1);
    }

    static loadContractInitFunction(): Promise<SmartContractFunction> {
        const promise = new Promise<SmartContractFunction>((resolve, reject) => {
            Utils.loadProvenanceConfig().then((config) => {
                resolve (new ObjectSmartContractFunction(config.initArgs, 'instantiate', SmartContractFunctionType.Instantiate) as SmartContractFunction);
            }).catch((err) => {
                reject(err);
            });
        });

        return promise;
    }

    static loadContractFunctions(): Promise<SmartContractFunctions> {
        const promise = new Promise<SmartContractFunctions>((resolve, reject) => {
            var initFuncton: SmartContractFunction;
            var executeFunctions: SmartContractFunction[] = [];
            var queryFunctions: SmartContractFunction[] = [];

            Utils.loadContractInitFunction().then((func) => {
                // save the init function
                initFuncton = func;

                vscode.workspace.findFiles('schema/*.json', '/').then((foundFiles: vscode.Uri[]) => {
                    if (foundFiles && foundFiles.length > 0) {
                        Promise.all(foundFiles.map(async (foundFile) => {
                            return new Promise<void>((iresolve) => {
                                vscode.workspace.openTextDocument(foundFile).then((jsonSchemaDoc) => {
                                    let jsonSchema: any = JSON.parse(jsonSchemaDoc.getText());
                                    //console.dir(jsonSchema);
    
                                    if (jsonSchema.$schema && jsonSchema.$schema.includes('http://json-schema.org/')) {
                                        if (jsonSchema.title == 'ExecuteMsg') {
                                            jsonSchema.anyOf.forEach((jsonSchemaFunc: any) => {
                                                try {
                                                    var scFunc = new JSONSchemaSmartContractFunction(jsonSchemaFunc, SmartContractFunctionType.Execute);
                                                    executeFunctions.push(scFunc);
                                                } catch (ex) {}
                                            });
                                        } else if (jsonSchema.title == 'QueryMsg') {
                                            jsonSchema.anyOf.forEach((jsonSchemaFunc: any) => {
                                                try {
                                                    var scFunc = new JSONSchemaSmartContractFunction(jsonSchemaFunc, SmartContractFunctionType.Query);
                                                    queryFunctions.push(scFunc);
                                                } catch (ex) {}
                                            });
                                        }
                                    }
    
                                    iresolve();
                                });
                            });
                        })).then(() => {
                            //console.dir(initFuncton);
                            //console.dir(executeFunctions);
                            //console.dir(queryFunctions);
                            resolve({
                                instantiateFunction: initFuncton,
                                executeFunctions: executeFunctions,
                                queryFunctions: queryFunctions
                            });
                        });
                    } else {
                        reject(new Error("Workspace does not contain JSON schemas in the '/schemas' directory."));
                    }
                });
            }).catch((err) => {
                reject(err);
            });
        });

        return promise;
    }

    // Attempts to find a contract by address... if address is not provided or undefined, will find the contract by label
    static findContract(provenance: Provenance, addr: (string | undefined) = undefined): Promise<Contract> {
        return new Promise<Contract>((resolve, reject) => {
            Utils.loadProvenanceConfig().then((config) => {
                if (addr) {
                    provenance.getContractByAddress(addr).then((contract) => {
                        resolve(contract);
                    }).catch((err) => {
                        reject(err);
                    });
                } else {
                    provenance.getContractByContractLabel(config.contractLabel).then((contract) => {
                        resolve(contract);
                    }).catch((err) => {
                        reject(err);
                    });
                }
            }).catch((err) => {
                reject(err);
            });
        });
    }

    static isValidUrl(url: string): boolean {
        try {
          new URL(url);
        } catch (e) {
          console.error(e);
          return false;
        }
        return true;
    };

    static getRepoRemoteUrl(defaultUrl: (string | undefined) = undefined): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const git = SimpleGit(Utils.getWorkspaceFolder());
            git.getRemotes(true).then((remotes: RemoteWithRefs[]) => {
                var originRemote: string = '';
                remotes.forEach((remote) => {
                    if (remote.name == 'origin') {
                        originRemote = remote.refs.fetch;
                    }
                });
                if (originRemote.length > 0) {
                    if (!Utils.isValidUrl(originRemote)) {
                        if (originRemote.startsWith('git@github.com:')) {
                            originRemote = originRemote.replace('git@github.com:', 'https://github.com/')
                        }
                        console.log(`originRemote=${originRemote}`);
                    }
                    if (Utils.isValidUrl(originRemote)) {
                        resolve(originRemote);
                    } else {
                        if (defaultUrl) {
                            resolve(defaultUrl);
                        } else {
                            reject(new Error('Origin url appears invalid.'));
                        }
                    }
                } else {
                    if (defaultUrl) {
                        resolve(defaultUrl);
                    } else {
                        reject(new Error('Origin remote not found. Workspace not a git repo?'));
                    }
                }
            }).catch((err) => {
                if (defaultUrl) {
                    resolve(defaultUrl);
                } else {
                    reject(err);
                }
            });
        });
    }

    static getRepoRemoteUrlWithDefault(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            Utils.loadProvenanceConfig().then((config: ProvenanceConfig) => {
                var defaultUrl: string = `https://unknown/url/to/${config.contractLabel}`;

                Utils.getRepoRemoteUrl(defaultUrl).then((remoteUrl) => {
                    resolve(remoteUrl);
                }).catch((err) => {
                    reject(err);
                });
            }).catch((err) => {
                reject(err);
            });
        });
    }

}

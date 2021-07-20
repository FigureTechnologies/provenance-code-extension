import * as vscode from 'vscode';
import * as async from 'async';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as fsx from 'fs-extra';
import * as Mustache from 'mustache';
import * as path from 'path';
import { URL } from 'url';
import SimpleGit, { RemoteWithRefs } from 'simple-git';

import { Config, TemplateConfig } from './config';
import { GlobalState } from './state';

import { Contract, Provenance, ProvenanceConfig } from './ProvenanceClient'

import { EmptyGitUserConfig, GitUserConfig } from './webviews/chain-panel/app/git-user-config';
import { SmartContractFunction, SmartContractFunctionProperty, SmartContractFunctionType, SmartContractFunctions } from './webviews/run-panel/app/smart-contract-function';
import { SmartContractTemplate } from './webviews/chain-panel/app/smart-contract-template';

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
                                    if (jsonSchema.$schema && jsonSchema.$schema.includes('http://json-schema.org/')) {
                                        if (jsonSchema.title == 'ExecuteMsg' && jsonSchema.anyOf) {
                                            jsonSchema.anyOf.forEach((jsonSchemaFunc: any) => {
                                                try {
                                                    var scFunc = new JSONSchemaSmartContractFunction(jsonSchemaFunc, SmartContractFunctionType.Execute);
                                                    executeFunctions.push(scFunc);
                                                } catch (ex) {}
                                            });
                                        } else if (jsonSchema.title == 'QueryMsg' && jsonSchema.anyOf) {
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

    static getGitUserConfig(): Promise<GitUserConfig> {
        return new Promise<GitUserConfig>((resolve, reject) => {
            SimpleGit().listConfig().then((summary) => {
                var userConfig: GitUserConfig = EmptyGitUserConfig;
                if ("user.name" in summary.all) {
                    userConfig.name = summary.all["user.name"] as string;
                }
                if ("user.email" in summary.all) {
                    userConfig.email = summary.all["user.email"] as string;
                }
                resolve(userConfig);
            }).catch((err) => {
                reject(err);
            });
        });
    }

    static getSmartContractTemplates(): Promise<SmartContractTemplate[]> {
        return new Promise<SmartContractTemplate[]>((resolve, reject) => {
            var templates: SmartContractTemplate[] = [];
            async.eachSeries(Config.Templates, (template, callback) => {
                Utils.ensureSmartContractTemplateExists(template).then(() => {
                    const templateCache = GlobalState.get().templateCache;
                    const localTemplatePath = path.join(templateCache.path, template.dir);
                    const git = SimpleGit(localTemplatePath);
                    git.tags().then((tags) => {
                        templates.push({
                            name: template.name,
                            description: template.description,
                            versions: tags.all
                        });
                        callback();
                    }).catch((err) => {
                        callback(err);
                    });
                }).catch((err) => {
                    callback(err);
                });
            }, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(templates);
                }
            });
        });
    }

    static ensureSmartContractTemplateExists(templateConfig: TemplateConfig): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const templateCache = GlobalState.get().templateCache;
            async.series([
                // ensure the template cache directory exists
                (callback) => {
                    if (!fs.existsSync(templateCache.path)) {
                        console.log(`Creating template cache path ${templateCache.path}`);
                        fs.mkdirSync(templateCache.path, { recursive: true });
                    }
                    callback();
                },

                // ensure the specified template has been cloned locally
                (callback) => {
                    const localTemplatePath = path.join(templateCache.path, templateConfig.dir);
                    if (!fs.existsSync(localTemplatePath)) {
                        SimpleGit().clone(templateConfig.repo, localTemplatePath).then(() => {
                            console.log('Done cloning');
                            callback();
                        }).catch((err) => {
                            callback(new Error(`Failed to clone smart contract template '${templateConfig.name}': ${err.message}`));
                        });
                    } else {
                        callback();
                    }
                },

                // ensure that we have the latest
                (callback) => {
                    const localTemplatePath = path.join(templateCache.path, templateConfig.dir);
                    const git = SimpleGit(localTemplatePath);
                    git.pull().then(() => {
                        callback();
                    }).catch((err) => {
                        callback(err);
                    });
                }
            ], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    static findSmarContractTemplateConfigByName(name: string): Promise<TemplateConfig> {
        return new Promise<TemplateConfig>((resolve, reject) => {
            var templateConfig = Config.Templates.find((templateConfig) => templateConfig.name == name);
            if (templateConfig) {
                resolve(templateConfig);
            } else {
                reject(new Error(`Unable to locate smart contract template '${name}'`));
            }
        });
    }

    static readDirRecursivelyFilesOnly(dir: string, filter: (((dirent: fs.Dirent) => boolean) | undefined) = undefined): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            var dirents: string[] = [];
            fsx.readdir(dir, { withFileTypes: true }).then((files) => {
                async.eachSeries(files, (file, callback) => {
                    if (file.isFile()) {
                        if (!filter || filter(file)) {
                            dirents.push(path.join(dir, file.name));
                        }
                        callback();
                    } else if (file.isDirectory()) {
                        if (!filter || filter(file)) {
                            Utils.readDirRecursivelyFilesOnly(path.join(dir, file.name), filter).then((subdir_files) => {
                                dirents = dirents.concat(subdir_files);
                                callback();
                            }).catch((err) => {
                                callback(err);
                            });
                        } else {
                            callback();
                        }
                    } else {
                        callback();
                    }
                }, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(dirents);
                    }
                });
            }).catch((err) => {
                reject(err);
            });
        });
    }

    static openProject(location: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            var currentWorkspaceFolderCount = 0;
            if (vscode.workspace.workspaceFolders) {
                currentWorkspaceFolderCount = vscode.workspace.workspaceFolders.length;
            }
            if (vscode.workspace.updateWorkspaceFolders(0, currentWorkspaceFolderCount, {
                uri: vscode.Uri.file(location)
            })) {
                // add the project to the recents list
                const globalState = GlobalState.get();
                if (globalState.recentProjects.projectLocations.includes(location)) {
                    const index = globalState.recentProjects.projectLocations.indexOf(location, 0);
                    if (index > -1) {
                        globalState.recentProjects.projectLocations.splice(index, 1);
                    }
                    globalState.recentProjects.projectLocations.unshift(location);
                } else {
                    globalState.recentProjects.projectLocations.unshift(location);
                }
                globalState.save();

                resolve();
            } else {
                reject(new Error(`Unable to open project from "${location}"`));
            }
        });
    }

    static createProjectFromTemplate(name: string, location: string, repo: string, template: string, version: string, author: string, email: string, org: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const templateCache = GlobalState.get().templateCache;
            const projectLocation = path.join(location, name);
            var templateConfig: (TemplateConfig | undefined) = undefined;

            async.series([
                // lookup template from config
                (callback) => {
                    console.log(`Looking up template '${template}' from config...`);
                    Utils.findSmarContractTemplateConfigByName(template).then((template) => {
                        templateConfig = template;
                        callback();
                    }).catch((err) => {
                        callback(err);
                    });
                },

                // ensure the template exists locally
                (callback) => {
                    const template = templateConfig as TemplateConfig;
                    console.log(`Ensure the template '${template.name}' exists locally...`);
                    Utils.ensureSmartContractTemplateExists(template).then(() => {
                        callback();
                    }).catch((err) => {
                        callback(err);
                    });
                },

                // copy the template to the project location
                (callback) => {
                    const template = templateConfig as TemplateConfig;
                    const localTemplatePath = path.join(templateCache.path, template.dir);

                    if (!fs.existsSync(projectLocation)) {
                        console.dir(`Creating directory for project: ${projectLocation}`);
                        fsx.mkdirpSync(projectLocation);
                    }

                    console.dir(`Copying template from ${localTemplatePath} to ${projectLocation}`);
                    fsx.copy(localTemplatePath, projectLocation, {
                        filter: (src, dest) => {
                            return true;
                        }
                    }).then(() => {
                        callback();
                    }).catch((err: Error) => {
                        console.error(`Copy failed: ${err.message}`);
                        callback(err);
                    });
                },

                // checkout the correct version in the project
                (callback) => {
                    console.log(`Checking out version '${version}'...`);
                    const git = SimpleGit(projectLocation);
                    git.checkout(version).then(() => {
                        callback();
                    }).catch((err) => {
                        console.error(`Checkout failed: ${err.message}`);
                        callback(err);
                    });
                },

                // clear git repo in the project
                (callback) => {
                    console.log(`Resetting git repo...`);
                    const gitDir = path.join(projectLocation, '.git');
                    fsx.remove(gitDir).then(() => {
                        callback();
                    }).catch((err) => {
                        console.error(`Removing .git directory failed: ${err.message}`);
                        callback(err);
                    })
                },

                // initialize the git repo in the project
                (callback) => {
                    console.log(`Initializing git repo...`);
                    const git = SimpleGit(projectLocation);
                    git.init().addRemote('origin', repo).then(() => {
                        callback();
                    }).catch((err) => {
                        console.error(`Failed to initialize git repo: ${err.message}`);
                        callback(err);
                    });
                },

                // render the template
                (callback) => {
                    console.log(`Rendering template...`);
                    const view = {
                        contract: {
                            name: name,
                            snake: name.replace("-", '_'),
                        },
                        git: {
                            userName: author,
                            emailAddress: email,
                            repoUrl: repo
                        },
                        company: org
                    }

                    const ignoreList: string[] = [
                        '.git',
                        '.DS_Store'
                    ];
                    Utils.readDirRecursivelyFilesOnly(projectLocation, (file: fs.Dirent) => {
                        return !ignoreList.includes(file.name);
                    }).then((files) => {
                        files.forEach((file) => {
                            console.log(`Rendering template for file: ${file}`);

                            const templateData = fs.readFileSync(file, {
                                encoding: 'utf8',
                                flag: 'r'
                            });

                            const fileData = Mustache.render(templateData, view);

                            fs.writeFileSync(file, fileData, {
                                encoding: 'utf8',
                                flag: 'w'
                            });
                        });
                        callback();
                    }).catch((err) => {
                        callback(err);
                    });
                },

                // add the project to the workspace
                (callback) => {
                    console.log(`Adding project to workspace...`);
                    Utils.openProject(projectLocation).finally(() => {
                        callback()
                    });
                }
            ], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

}

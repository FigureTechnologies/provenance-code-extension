import * as vscode from 'vscode';

import { ArgParser } from '../../ArgParser';
import { Provenance, ProvenanceConfig } from '../../ProvenanceClient'
import { Alert, RunViewAppBinding } from './app/app-binding';
import { SmartContractInfo } from './app/smart-contract-info';
import { EmptySmartContractFunction, SmartContractFunctions } from './app/smart-contract-function';
import { Utils } from '../../utils';

enum RunPanelViewUpdateType {
	ContractInfo,
    ContractInstances,
    SigningKeys,
	Markers,
    ContractFunctions,
    All
}

export class RunPanelViewUpdater {
	static readonly RunPanelViewUpdateType = RunPanelViewUpdateType;

    static runViewApp: RunViewAppBinding;
    static provenance: Provenance;

    static functions: SmartContractFunctions;

	static update(config: ProvenanceConfig, type: RunPanelViewUpdateType = RunPanelViewUpdateType.All): void {
        if(RunPanelViewUpdater.runViewApp && RunPanelViewUpdater.runViewApp.isReady) {
            // hide all alerts first
            RunPanelViewUpdater.runViewApp.clearAlerts();
    
            // update the contract info
            if (type == RunPanelViewUpdateType.All || type == RunPanelViewUpdateType.ContractInfo) {
                Utils.getRepoRemoteUrlWithDefault().then((remoteUrl: string) => {
                    var latestCodeId = -1;
                    RunPanelViewUpdater.provenance.getLatestCodeIdBySourceRepo(remoteUrl).then((codeId) => {
                        latestCodeId = codeId;
                    }).catch((err) => {
                    }).finally(() => {
                        ArgParser.generateInitArgs(RunPanelViewUpdater.provenance, config.initArgs).then((initArgs) => {
                            RunPanelViewUpdater.provenance.getContractByContractLabel(config.contractLabel).then((contract) => {
                                console.log('Setting contract info...');
                                RunPanelViewUpdater.runViewApp.contractInfo = {
                                    name: config.contractLabel,
                                    source: remoteUrl,
                                    address: contract.address,
                                    codeId: contract.contract_info.code_id,
                                    latestCodeId: latestCodeId,
                                    isSingleton: config.isSingleton,
                                    initFunction: RunPanelViewUpdater.functions.instantiateFunction,
                                    defaultInitArgs: initArgs 
                                };
                            }).catch((err) => {
                                console.log('Contract not found...');
                                RunPanelViewUpdater.runViewApp.contractInfo = {
                                    name: config.contractLabel,
                                    source: remoteUrl,
                                    address: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                                    codeId: 0,
                                    latestCodeId: 0,
                                    isSingleton: config.isSingleton,
                                    initFunction: RunPanelViewUpdater.functions.instantiateFunction,
                                    defaultInitArgs: initArgs
                                };
                    
                                RunPanelViewUpdater.runViewApp.showAlert(Alert.Danger, 'Contract not found!', 'Before you can execute the contract, you must first build, store and instantiate it on the Provenance blockchain.', false);
                            });
                        }).catch((err) => {
                            vscode.window.showErrorMessage(err.message);
                        });
                    });
                }).catch((err) => {
                    vscode.window.showErrorMessage(err.message);
                });
            }

            // update the contract instances
            if (type == RunPanelViewUpdateType.All || type == RunPanelViewUpdateType.ContractInstances) {
                Utils.getRepoRemoteUrlWithDefault().then((remoteUrl: string) => {
                    var latestCodeId = -1;
                    RunPanelViewUpdater.provenance.getLatestCodeIdBySourceRepo(remoteUrl).then((codeId) => {
                        latestCodeId = codeId;
                    }).catch((err) => {
                    }).finally(() => {
                        RunPanelViewUpdater.provenance.getAllContractsByContractLabel(config.contractLabel).then((contracts) => {
                            console.log('Setting contract instances...');
                            var instances: SmartContractInfo[] = [];
                            contracts.forEach((contract) => {
                                instances.push({
                                    name: config.contractLabel,
                                    source: remoteUrl,
                                    address: contract.address,
                                    codeId: contract.contract_info.code_id,
                                    latestCodeId: latestCodeId,
                                    isSingleton: config.isSingleton,
                                    initFunction: EmptySmartContractFunction,
                                    defaultInitArgs: undefined
                                });
                            });
                            RunPanelViewUpdater.runViewApp.contractInstances = instances;
                        }).catch((err) => {
                            vscode.window.showErrorMessage(err.message);
                        });
                    });
                }).catch((err) => {
                    vscode.window.showErrorMessage(err.message);
                });
            }
    
            // update the signing keys
            if (type == RunPanelViewUpdateType.All || type == RunPanelViewUpdateType.SigningKeys) {
                RunPanelViewUpdater.provenance.getAllKeys().then((keys) => {
                    console.log('Setting keys...');
                    RunPanelViewUpdater.runViewApp.signingKeys = keys;
                }).catch((err) => {
                    vscode.window.showErrorMessage(err.message);
                });
            }
    
            // update the markers
            if (type == RunPanelViewUpdateType.All || type == RunPanelViewUpdateType.Markers) {
                RunPanelViewUpdater.provenance.getAllMarkers().then((markers) => {
                    console.log('Setting markers...');
                    RunPanelViewUpdater.runViewApp.markers = markers;
                }).catch((err) => {
                    vscode.window.showErrorMessage(err.message);
                });
            }
    
            // update the contract functions
            if (type == RunPanelViewUpdateType.All || type == RunPanelViewUpdateType.ContractFunctions) {
                console.log('Setting contract functions...');
                RunPanelViewUpdater.runViewApp.executeFunctions = RunPanelViewUpdater.functions.executeFunctions;
                RunPanelViewUpdater.runViewApp.queryFunctions = RunPanelViewUpdater.functions.queryFunctions;
            }
        }
    }

}

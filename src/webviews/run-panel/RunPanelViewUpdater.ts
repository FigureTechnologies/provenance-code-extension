import * as vscode from 'vscode';

import { Provenance, ProvenanceConfig } from '../../ProvenanceClient'
import { Alert, RunViewAppBinding } from './app/app-binding';
import { SmartContractFunctionType, SmartContractFunctions } from './app/smart-contract-function';

enum RunPanelViewUpdateType {
	ContractInfo,
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
                RunPanelViewUpdater.provenance.getContractByContractLabel(config.contractLabel).then((contract) => {
                    console.log('Setting contract info...');
                    RunPanelViewUpdater.runViewApp.contractInfo = {
                        name: config.contractLabel,
                        address: contract.address,
                        codeId: contract.contract_info.code_id,
                        isSingleton: config.isSingleton,
                        initFunction: {
                            name: 'instantiate',
                            type: SmartContractFunctionType.Instantiate,
                            properties: [] // TODO: Build props from config.initArgs
                        }
                    };
                }).catch((err) => {
                    console.log('Contract not found...');
                    RunPanelViewUpdater.runViewApp.contractInfo = {
                        name: config.contractLabel,
                        address: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                        codeId: 0,
                        isSingleton: true,
                        initFunction: {
                            name: 'instantiate',
                            type: SmartContractFunctionType.Instantiate,
                            properties: []
                        }
                    };
        
                    RunPanelViewUpdater.runViewApp.showAlert(Alert.Danger, 'Contract not found!', 'Before you can execute the contract, you must first build, store and instantiate it on the Provenance blockchain.', false);
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

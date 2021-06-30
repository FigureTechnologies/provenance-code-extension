import * as vscode from 'vscode';

import { Provenance, ProvenanceConfig } from '../../ProvenanceClient'
import { ChainViewAppBinding } from './app/app-binding';

enum ChainPanelViewUpdateType {
	Keys,
	Markers,
    All
}

export class ChainPanelViewUpdater {
	static readonly ChainPanelViewUpdateType = ChainPanelViewUpdateType;

    static chainViewApp: ChainViewAppBinding;
    static provenance: Provenance;

	static update(config: ProvenanceConfig, type: ChainPanelViewUpdateType = ChainPanelViewUpdateType.All): void {
		if(ChainPanelViewUpdater.chainViewApp && ChainPanelViewUpdater.chainViewApp.isReady) {

			// update the accounts/keys
			if (type == ChainPanelViewUpdateType.All || type == ChainPanelViewUpdateType.Keys) {
				ChainPanelViewUpdater.provenance.getAllKeys().then((keys) => {
					console.log(`Setting keys (${keys.length})...`);
					ChainPanelViewUpdater.chainViewApp.keys = keys;
				}).catch((err) => {
					vscode.window.showErrorMessage(err.message);
				});
			}


			// update the markers
			if (type == ChainPanelViewUpdateType.All || type == ChainPanelViewUpdateType.Markers) {
				ChainPanelViewUpdater.provenance.getAllMarkers().then((markers) => {
					console.log(`Setting markers (${markers.length})...`);
					ChainPanelViewUpdater.chainViewApp.markers = markers;
				}).catch((err) => {
					vscode.window.showErrorMessage(err.message);
				});
			}

		}
	}
}

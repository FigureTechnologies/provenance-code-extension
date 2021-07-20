import * as vscode from 'vscode';

import { Provenance } from '../../ProvenanceClient'
import { ChainViewAppBinding } from './app/app-binding';
import { Utils } from '../../utils';
import { GlobalState } from '../../state';

enum ChainPanelViewUpdateType {
	Keys,
	Markers,
	Templates,
	RecentProjects,
	GitUserConfig,
    All
}

export class ChainPanelViewUpdater {
	static readonly ChainPanelViewUpdateType = ChainPanelViewUpdateType;

    static chainViewApp: ChainViewAppBinding;
    static provenance: Provenance;

	static update(type: ChainPanelViewUpdateType = ChainPanelViewUpdateType.All): void {
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

			// update the templates
			if (type == ChainPanelViewUpdateType.All || type == ChainPanelViewUpdateType.Templates) {
				Utils.getSmartContractTemplates().then((templates) => {
					console.log(`Setting templates (${templates.length})...`);
					ChainPanelViewUpdater.chainViewApp.templates = templates;
				}).catch((err) => {
					vscode.window.showErrorMessage(err.message);
				});
			}

			// update the recent projects
			if (type == ChainPanelViewUpdateType.All || type == ChainPanelViewUpdateType.RecentProjects) {
				const recentProjects = GlobalState.get().recentProjects.projectLocations;
				console.log(`Setting recent projects (${recentProjects.length})...`);
				ChainPanelViewUpdater.chainViewApp.recentProjects = recentProjects;
			}

			// update the git user config
			if (type == ChainPanelViewUpdateType.All || type == ChainPanelViewUpdateType.GitUserConfig) {
				Utils.getGitUserConfig().then((gitUserConfig) => {
					console.log(`Setting git user config...`);
					ChainPanelViewUpdater.chainViewApp.gitUserConfig = gitUserConfig;
				}).catch((err) => {
					vscode.window.showErrorMessage(err.message);
				});
			}

		}
	}
}

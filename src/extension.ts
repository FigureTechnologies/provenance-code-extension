import * as vscode from 'vscode';
import * as glob from 'glob';
import * as async from 'async';

import { ArgParser } from './ArgParser';
import { Utils } from './utils';
import { GlobalState } from './state';
import { Key, Marker, MarkerAccess, MarkerType, Provenance, ProvenanceConfig, ProvenanceKeyConfig, ProvenanceMarkerConfig, ProvenanceMarkerGrant } from './ProvenanceClient'

import { ChainViewAppBinding } from './webviews/chain-panel/app/app-binding';
import { ChainPanelViewLoader } from './webviews/chain-panel/ChainPanelViewLoader';
import { ChainPanelViewUpdater } from './webviews/chain-panel/ChainPanelViewUpdater';

import { ExecuteFunctionCoin, RunViewAppBinding } from './webviews/run-panel/app/app-binding';
import { RunPanelViewLoader } from './webviews/run-panel/RunPanelViewLoader';
import { RunPanelViewUpdater } from './webviews/run-panel/RunPanelViewUpdater';

import { SmartContractFunction, SmartContractFunctions } from './webviews/run-panel/app/smart-contract-function';
import { ProvenanceAccountBalance } from './webviews/chain-panel/app/provenance-account-balance';
import { ProvenanceKey } from './webviews/chain-panel/app/provenance-key';
import { ProvenanceMarker, ProvenanceMarkerAccessControl } from './webviews/chain-panel/app/provenance-marker';

let provenance: Provenance = new Provenance();
let lastWasmCodeId: number = -1;
let isBusy: boolean = false;

let globalState: GlobalState;

let chainPanelView: ChainPanelViewLoader;
let chainViewApp: ChainViewAppBinding;
ChainPanelViewUpdater.provenance = provenance;

let runPanelView: RunPanelViewLoader;
let runViewApp: RunViewAppBinding;
RunPanelViewUpdater.provenance = provenance;

const buildWasmCommand = 'provenance.build';
const chainUtilsCommand = 'provenance.chain-utils';
const compileWasmCommand = 'provenance.compile';
const getKeysCommand = 'provenance.get-keys';
const instantiateOrMigrateWasmCommand = 'provenance.instantiate-or-migrate';
const openTerminalCommand = 'provenance.open-terminal';
const runWasmCommand = 'provenance.run';
const storeWasmCommand = 'provenance.store';

var leftStatusBarSepItem: vscode.StatusBarItem;
var provenanceStatusBarItem: vscode.StatusBarItem;
var compileWasmStatusBarItem: vscode.StatusBarItem;
var buildWasmStatusBarItem: vscode.StatusBarItem;
var runWasmStatusBarItem: vscode.StatusBarItem;
var chainUtilsStatusBarItem: vscode.StatusBarItem;
var openTerminalStatusBarItem: vscode.StatusBarItem;
var rightStatusBarSepItem: vscode.StatusBarItem;

function compileWasm(): Promise<void> {
	const promise = new Promise<void>((resolve, reject) => {
		Utils.loadProvenanceConfig().then((config: ProvenanceConfig) => {
			Utils.runCommand(`make ${config.build.target}`).then(() => {
				resolve();
			}).catch((err) => {
				reject(new Error('Failed to compile WASM'));
			});
		}).catch((err: Error) => {
			reject(err);
		});
	});

	return promise;
}

function storeWasm(): Promise<number> {
	return new Promise<number>((resolve, reject) => {
		Utils.getRepoRemoteUrlWithDefault().then((remoteUrl: string) => {
			glob(`artifacts/*.wasm`, { cwd: Utils.getWorkspaceFolder() }, function (err, files) {
				if (err || files == undefined || files.length == 0) {
					reject(new Error('WASM file not found!'));
				} else {
					// TODO: get builder???
					provenance.storeWasm(files[0], remoteUrl, 'cosmwasm/rust-optimizer:0.10.7').then((codeId: number) => {
						lastWasmCodeId = codeId;
						resolve(codeId);
					}).catch((err: Error) => {
						reject(err);
					});
				}
			});
		}).catch((err) => {
			reject(err);
		});
	});
}

function findKeyWithMostCoinOfDenom(denom: string): Promise<Key> {
	return new Promise<Key>((resolve, reject) => {
		provenance.getAllKeys().then((keys) => {
			var top_key: Key;
			var top_coin = 0;

			async.eachSeries(keys, (key, callback) => {
				provenance.getAccountBalances(key.address).then((assets) => {
					assets.forEach((asset) => {
						if (asset.denom == denom && asset.amount > top_coin) {
							top_coin = asset.amount;
							top_key = key;
						}
					});
					callback();
				}).catch((err) => {
					callback(err);
				});
			}, (err) => {
				if (err) {
					reject(err);
				} else {
					if (top_coin > 0) {
						resolve(top_key);
					} else {
						reject(new Error(`Unable to locate key with ${denom} coins`));
					}
				}
			});
		}).catch((err) => {
			reject(err);
		});
	});
}

async function ensureKeysExist(keys: ProvenanceKeyConfig[]): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		var createKeys: Promise<Key>[] = [];

		keys.forEach((key) => {
			if (!provenance.doesKeyExist(key.name)) {
				createKeys.push(provenance.createKey(key.name));
			}
		});

		Promise.all(createKeys).then((createdKeys: Key[]) => {
			createdKeys.forEach((createdKey) => {
				console.log(`Created key ${createdKey.name} -> ${createdKey.address}`);
			});
			resolve();
		}).catch((err) => {
			reject(err);
		});
	});
}

async function ensureKeysHaveHash(keys: ProvenanceKeyConfig[]): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		var fundAccounts: any[] = [];

		provenance.getMarker('nhash').then((marker) => {
			// TODO: this finds the first address with WITHDRAW perms... we need to ensure it's in our keyring and we have the private key to sign
			var withdrawer = marker.access_control.find((access) => {
				return access.permissions.find((perm) => {
					return (perm == 'ACCESS_WITHDRAW');
				}) != undefined;
			});
			if (withdrawer != undefined) {
				async.eachSeries(keys, (key, callback) => {
					console.log(`Checking if ${key.name} has hash...`);
		
					var needs_hash = true;
					var withdraw_amount = key.initialHash;
		
					provenance.getAccountBalances(provenance.getAddressForKey(key.name)).then((holdings) => {
						holdings.forEach((holding) => {
							if (holding.denom == 'nhash') {
								if (holding.amount >= key.minHash) {
									needs_hash = false;
								} else if (holding.amount > 0) {
									withdraw_amount = key.minHash - holding.amount;
								}
							}
						});
						if (needs_hash) {
							fundAccounts.push({
								key: key.name,
								amount: withdraw_amount
							});
						}
						callback();
					}).catch((err) => {
						callback(err);
					});
				}, (err) => {
					if (err) {
						reject(err);
					} else {
						async.eachSeries(fundAccounts, (fundAccount, callback) => {
							provenance.withdrawCoin('nhash', fundAccount.amount, fundAccount.key, withdrawer!!.address).then(() => {
								callback();
							}).catch((err) => {
								console.log('Unable to withdraw hash... looking for a loaded key');
								findKeyWithMostCoinOfDenom('nhash').then((key) => {
									provenance.sendCoin('nhash', fundAccount.amount, fundAccount.key, key.address).then(() => {
										callback();
									}).catch((err) => {
										callback(err);
									});
								}).catch((err) => {
									callback(err);
								});
							});
						}, (err) => {
							if (err) {
								reject(err);
							} else {
								resolve();
							}
						});
					}
				});
			} else {
				reject(new Error(`Unable to locate key with WITHDRAW permissions for nhash`));
			}
		}).catch((err) => {
			reject(new Error(`Unable to locate nhash marker`));
		});
	});
}

async function ensureMarkersExist(markers: ProvenanceMarkerConfig[]): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		var createMarkers: Promise<Marker>[] = [];

		markers.forEach((marker) => {
			console.log(`Checking if marker exists: ${marker.denom}`);
			if (!provenance.doesMarkerExist(marker.denom)) {
				console.log(`Marker does not exist: ${marker.denom}`);
				createMarkers.push(provenance.createMarker(marker.denom, marker.supply, marker.manager, marker.type.toUpperCase() as MarkerType, marker.grants));
			} else {
				console.log(`Marker exists: ${marker.denom}`);
			}
			// TODO: check if marker is active... maybe getMarker and check state?
		});
		
		Promise.all(createMarkers).then((createdMarkers: Marker[]) => {
			createdMarkers.forEach((createdMarker) => {
				console.log(`Created marker ${createdMarker.denom} with supply of ${createdMarker.supply}`);
			});
			resolve();
		}).catch((err) => {
			reject(err);
		});
	});
}

function instantiateOrMigrateWasm(codeId: number): Promise<void> {
	const promise = new Promise<void>((resolve, reject) => {
		// load the provenance config for the project
		Utils.loadProvenanceConfig().then(async (config: ProvenanceConfig) => {
			// ensure that the keys from the project config environment exist
			if (config.env && config.env.keys && config.env.keys.length > 0) {
				try {
					await ensureKeysExist(config.env.keys);
					await ensureKeysHaveHash(config.env.keys);
				} catch (err) {
					return reject(err);
				}
			}

			// ensure that the markers from the project config environment exist
			if (config.env && config.env.markers && config.env.markers.length > 0) {
				try {
					await ensureMarkersExist(config.env.markers);
				} catch (err) {
					return reject(err);
				}
			}

			// generate the init args
			var initArgs = {};
			try {
				initArgs = await ArgParser.generateInitArgs(provenance, config.initArgs);
				console.log('Using init args:');
				console.dir(initArgs);
			} catch (err) {
				return reject(err);
			}

			// find the latest code id for the contract by its label
			provenance.getLatestCodeIdByContractLabel(config.contractLabel).then((latestCodeId: number) => {
				console.log(`Latest codeId for ${config.contractLabel} is ${latestCodeId}`);
				if (latestCodeId == -1) {
					console.log('Instantiating contract...');

					// setup name binding for the contract
					provenance.bindName(config.binding.name, config.binding.root, false).then(() => {
						if (config.isSingleton) {
							// instantiate the contract
							provenance.instantiateWasm(codeId, initArgs, config.contractLabel).then(() => {
								resolve();
							}).catch((err: Error) => {
								reject(err);
							});
						} else {
							// Don't instantiate a non-singleton contract!
							resolve();
						}
					}).catch((err) => {
						reject(err);
					});
				} else {
					console.log('Migrating contract...');

					// get the contract info
					const contract = provenance.getContractByCodeId(latestCodeId);
					if (contract) {
						if (config.isSingleton) {
							// migrate the contract
							provenance.migrateWasm(contract, codeId).then(() => {
								resolve();
							}).catch((err: Error) => {
								reject(err);
							});
						} else {
							// Don't migrate a non-singleton contract!
							resolve();
						}
					} else {
						reject(new Error(`Unable to locate contract info by code id ${latestCodeId}`));
					}
				}
			}).catch((err: Error) => {
				reject(err);
			});
		}).catch((err: Error) => {
			reject(err);
		});
	});

	return promise;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('provenance-smart-contract');

	leftStatusBarSepItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);

	provenanceStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);

	compileWasmStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	compileWasmStatusBarItem.command = compileWasmCommand;

	buildWasmStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	buildWasmStatusBarItem.command = buildWasmCommand;

	runWasmStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	runWasmStatusBarItem.command = runWasmCommand;

	chainUtilsStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	chainUtilsStatusBarItem.command = chainUtilsCommand;

	openTerminalStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	openTerminalStatusBarItem.command = openTerminalCommand;

	rightStatusBarSepItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);

	let build = vscode.commands.registerCommand(buildWasmCommand, () => {
		if (isBusy) {
			vscode.window.showWarningMessage('Provenance is currently busy');
		} else {
			isBusy = true;
			compileWasm().then(() => {
				storeWasm().then((codeId: number) => {
					lastWasmCodeId = codeId;
					console.log(`Successfully stored contract with codeId: ${codeId}`);
					instantiateOrMigrateWasm(codeId).then(() => {
						console.log(`Successfully built, stored and instantiated/migrated contract`);
						isBusy = false;
					}).catch((err) => {
						isBusy = false;
						vscode.window.showErrorMessage(err.message);
					});
				}).catch((err) => {
					isBusy = false;
					vscode.window.showErrorMessage(err.message);
				});
			}).catch((err) => {
				isBusy = false;
				vscode.window.showErrorMessage(err.message);
			});
		}
	});

	let compile = vscode.commands.registerCommand(compileWasmCommand, () => {
		if (isBusy) {
			vscode.window.showWarningMessage('Provenance is currently busy');
		} else {
			isBusy = true;
			compileWasm().then(() => {
				console.log(`Successfully compiled contract`);
				isBusy = false;
			}).catch((err) => {
				isBusy = false;
				vscode.window.showErrorMessage(err.message);
			});
		}
	});

	let chainUtils = vscode.commands.registerCommand(chainUtilsCommand, () => {
		chainViewApp = ChainViewAppBinding.getCodeInstance(chainPanelView.showView(`Provenance`));
		ChainPanelViewUpdater.chainViewApp = chainViewApp;
		chainPanelView.onDispose(() => {
			console.log('chainPanelView.onDispose');
			chainViewApp.unready();
		});
		chainPanelView.onDidChangeViewState(() => {
			console.log('chainPanelView.onDidChangeViewState');
			ChainPanelViewUpdater.update();
		});

		chainViewApp.waitForReady().then(() => {
			console.log('Chain view ready!');
			ChainPanelViewUpdater.update();

			// hook up execute function request handler
			chainViewApp.onGetAccountBalancesRequest((address: string, resolve: ((result: ProvenanceAccountBalance[]) => void), reject: ((err: Error) => void)) => {
				console.log('onGetAccountBalancesRequest');

				provenance.getAccountBalances(address).then((result) => {
					resolve(result);
				}).catch((err: Error) => {
					vscode.window.showErrorMessage(err.message);
					reject(err);
				});
			});

			chainViewApp.onCreateKeyRequest((name: string, resolve: ((result: ProvenanceKey) => void), reject: ((err: Error) => void)) => {
				console.log('onCreateKeyRequest');

				provenance.createKey(name).then((result) => {
					ChainPanelViewUpdater.update(ChainPanelViewUpdater.ChainPanelViewUpdateType.Keys);
					Utils.loadProvenanceConfig().then((config: ProvenanceConfig) => {
						RunPanelViewUpdater.update(config, RunPanelViewUpdater.RunPanelViewUpdateType.SigningKeys);
					}).catch((err) => {});
					resolve(result);
				}).catch((err: Error) => {
					vscode.window.showErrorMessage(err.message);
					reject(err);
				});
			});

			chainViewApp.onRecoverKeyRequest((name: string, mnemonic: string, resolve: ((result: ProvenanceKey) => void), reject: ((err: Error) => void)) => {
				console.log('onRecoverKeyRequest');

				provenance.recoverKey(name, mnemonic).then((result) => {
					ChainPanelViewUpdater.update(ChainPanelViewUpdater.ChainPanelViewUpdateType.Keys);
					Utils.loadProvenanceConfig().then((config: ProvenanceConfig) => {
						RunPanelViewUpdater.update(config, RunPanelViewUpdater.RunPanelViewUpdateType.SigningKeys);
					}).catch((err) => {});
					resolve(result);
				}).catch((err: Error) => {
					vscode.window.showErrorMessage(err.message);
					reject(err);
				});
			});

			chainViewApp.onDeleteKeyRequest((name: string, resolve: (() => void), reject: ((err: Error) => void)) => {
				console.log('onDeleteKeyRequest');

				provenance.deleteKey(name).then(() => {
					ChainPanelViewUpdater.update(ChainPanelViewUpdater.ChainPanelViewUpdateType.Keys);
					Utils.loadProvenanceConfig().then((config: ProvenanceConfig) => {
						RunPanelViewUpdater.update(config, RunPanelViewUpdater.RunPanelViewUpdateType.SigningKeys);
					}).catch((err) => {});
					resolve();
				}).catch((err) => {
					vscode.window.showErrorMessage(err.message);
					reject(err);
				});
			});

			chainViewApp.onCreateMarkerRequest((denom: string, supply: number, type: string, manager: string, access: ProvenanceMarkerAccessControl[], resolve: ((result: ProvenanceMarker) => void), reject: ((err: Error) => void)) => {
				console.log('onCreateMarkerRequest');

				var markerType: MarkerType = MarkerType.Coin;
				if (type == 'restricted') markerType = MarkerType.Restricted;

				var markerGrants: ProvenanceMarkerGrant[] = [];
				access.forEach((priv) => {
					var grant: ProvenanceMarkerGrant = {
						key: priv.address,
						privs: []
					};

					priv.permissions.forEach((perm) => {
						if (perm == 'ACCESS_ADMIN') grant.privs.push(MarkerAccess.Admin);
						if (perm == 'ACCESS_BURN') grant.privs.push(MarkerAccess.Burn);
						if (perm == 'ACCESS_DELETE') grant.privs.push(MarkerAccess.Delete);
						if (perm == 'ACCESS_DEPOSIT') grant.privs.push(MarkerAccess.Deposit);
						if (perm == 'ACCESS_MINT') grant.privs.push(MarkerAccess.Mint);
						if (perm == 'ACCESS_TRANSFER') grant.privs.push(MarkerAccess.Transfer);
						if (perm == 'ACCESS_WITHDRAW') grant.privs.push(MarkerAccess.Withdraw);
					});

					markerGrants.push(grant);
				});

				provenance.createMarker(denom, supply, manager, markerType, markerGrants).then((marker) => {
					ChainPanelViewUpdater.update(ChainPanelViewUpdater.ChainPanelViewUpdateType.Markers);
					Utils.loadProvenanceConfig().then((config: ProvenanceConfig) => {
						RunPanelViewUpdater.update(config, RunPanelViewUpdater.RunPanelViewUpdateType.Markers);
					}).catch((err) => {});
					resolve(marker);
				}).catch((err) => {
					vscode.window.showErrorMessage(err.message);
					reject(err);
				});
			});

			chainViewApp.onDeleteMarkerRequest((denom: string, from: string, resolve: (() => void), reject: ((err: Error) => void)) => {
				console.log('onDeleteMarkerRequest');

				provenance.deleteMarker(denom, from).then(() => {
					var checkInterval = setInterval(() => {
						if(!provenance.doesMarkerExist(denom)) {
							clearInterval(checkInterval);
							
							ChainPanelViewUpdater.update(ChainPanelViewUpdater.ChainPanelViewUpdateType.Markers);
							Utils.loadProvenanceConfig().then((config: ProvenanceConfig) => {
								RunPanelViewUpdater.update(config, RunPanelViewUpdater.RunPanelViewUpdateType.Markers);
							}).catch((err) => {});
							resolve();
						}
					}, 500);
				}).catch((err) => {
					vscode.window.showErrorMessage(err.message);
					reject(err);
				});
			});

			chainViewApp.onGrantMarkerPrivsRequest((denom: string, grants: ProvenanceMarkerAccessControl[], from: string, resolve: ((result: ProvenanceMarker) => void), reject: ((err: Error) => void)) => {
				console.log('onGrantMarkerPrivsRequest');

				var markerGrants: ProvenanceMarkerGrant[] = [];
				grants.forEach((priv) => {
					var grant: ProvenanceMarkerGrant = {
						key: priv.address,
						privs: []
					};

					priv.permissions.forEach((perm) => {
						if (perm == 'ACCESS_ADMIN') grant.privs.push(MarkerAccess.Admin);
						if (perm == 'ACCESS_BURN') grant.privs.push(MarkerAccess.Burn);
						if (perm == 'ACCESS_DELETE') grant.privs.push(MarkerAccess.Delete);
						if (perm == 'ACCESS_DEPOSIT') grant.privs.push(MarkerAccess.Deposit);
						if (perm == 'ACCESS_MINT') grant.privs.push(MarkerAccess.Mint);
						if (perm == 'ACCESS_TRANSFER') grant.privs.push(MarkerAccess.Transfer);
						if (perm == 'ACCESS_WITHDRAW') grant.privs.push(MarkerAccess.Withdraw);
					});

					markerGrants.push(grant);
				});

				async.eachSeries(markerGrants, (grant: ProvenanceMarkerGrant, callback) => {
					provenance.grantMarkerPrivs(denom, grant.key, grant.privs, from).then(() => {
						callback();
					}).catch((err) => {
						callback(err);
					});
				}, (err) => {
					if (err) {
						reject(err);
					} else {
						provenance.getMarker(denom).then((marker) => {
							ChainPanelViewUpdater.update(ChainPanelViewUpdater.ChainPanelViewUpdateType.Markers);
							Utils.loadProvenanceConfig().then((config: ProvenanceConfig) => {
								RunPanelViewUpdater.update(config, RunPanelViewUpdater.RunPanelViewUpdateType.Markers);
							}).catch((err) => {});
							resolve(marker);
						}).catch((err) => {
							reject(err);
						});
					}
				});
			});

			chainViewApp.onRevokeMarkerPrivsRequest((denom: string, address: string, from: string, resolve: ((result: ProvenanceMarker) => void), reject: ((err: Error) => void)) => {
				console.log('onRevokeMarkerPrivsRequest');

				provenance.revokeMarkerPrivs(denom, address, from).then(() => {
					provenance.getMarker(denom).then((marker) => {
						ChainPanelViewUpdater.update(ChainPanelViewUpdater.ChainPanelViewUpdateType.Markers);
						Utils.loadProvenanceConfig().then((config: ProvenanceConfig) => {
							RunPanelViewUpdater.update(config, RunPanelViewUpdater.RunPanelViewUpdateType.Markers);
						}).catch((err) => {});
						resolve(marker);
					}).catch((err) => {
						reject(err);
					});
				}).catch((err) => {
					reject(err);
				})
			});

			chainViewApp.onMintMarkerCoinsRequest((denom: string, amount: number, from: string, resolve: (() => void), reject: ((err: Error) => void)) => {
				console.log('onMintMarkerCoinsRequest');

				provenance.mintCoin(denom, amount, from).then(() => {
					ChainPanelViewUpdater.update(ChainPanelViewUpdater.ChainPanelViewUpdateType.Markers);
					Utils.loadProvenanceConfig().then((config: ProvenanceConfig) => {
						RunPanelViewUpdater.update(config, RunPanelViewUpdater.RunPanelViewUpdateType.Markers);
					}).catch((err) => {});
					console.log(`provenance.mintCoin.then`);
					resolve();
				}).catch((err) => {
					vscode.window.showErrorMessage(err.message);
					reject(err);
				});
			});

			chainViewApp.onBurnMarkerCoinsRequest((denom: string, amount: number, from: string, resolve: (() => void), reject: ((err: Error) => void)) => {
				console.log('onBurnMarkerCoinsRequest');

				provenance.burnCoin(denom, amount, from).then(() => {
					ChainPanelViewUpdater.update(ChainPanelViewUpdater.ChainPanelViewUpdateType.Markers);
					Utils.loadProvenanceConfig().then((config: ProvenanceConfig) => {
						RunPanelViewUpdater.update(config, RunPanelViewUpdater.RunPanelViewUpdateType.Markers);
					}).catch((err) => {});
					resolve();
				}).catch((err) => {
					vscode.window.showErrorMessage(err.message);
					reject(err);
				});
			});

			chainViewApp.onWithdrawMarkerCoinsRequest((denom: string, amount: number, to: string, from: string, resolve: (() => void), reject: ((err: Error) => void)) => {
				console.log('onWithdrawMarkerCoinsRequest');

				provenance.withdrawCoin(denom, amount, to, from).then(() => {
					resolve();
				}).catch((err) => {
					vscode.window.showErrorMessage(err.message);
					reject(err);
				});
			});

			chainViewApp.onSendCoinRequest((denom: string, amount: number, to: string, from: string, resolve: (() => void), reject: ((err: Error) => void)) => {
				console.log('onSendCoinRequest');

				provenance.sendCoin(denom, amount, to, from).then(() => {
					resolve();
				}).catch((err) => {
					vscode.window.showErrorMessage(err.message);
					reject(err);
				});
			});

			chainViewApp.onCreateNewProjectRequest((name: string, location: string, repo: string, template: string, version: string, author: string, email: string, org: string, resolve: (() => void), reject: ((err: Error) => void)) => {
				console.log('onCreateNewProjectRequest');

				Utils.createProjectFromTemplate(name, location, repo, template, version, author, email, org).then(() => {
					ChainPanelViewUpdater.update(ChainPanelViewUpdater.ChainPanelViewUpdateType.RecentProjects);
					resolve();
				}).catch((err) => {
					vscode.window.showErrorMessage(err.message);
					reject(err);
				});
			});

			chainViewApp.onOpenProjectRequest((location: string, resolve: (() => void), reject: ((err: Error) => void)) => {
				console.log('onOpenProjectRequest');

				Utils.openProject(location).then(() => {
					ChainPanelViewUpdater.update(ChainPanelViewUpdater.ChainPanelViewUpdateType.RecentProjects);
					resolve();
				}).catch((err) => {
					vscode.window.showErrorMessage(err.message);
					reject(err);
				});
			});

			chainViewApp.onClearRecentProjectsRequest((resolve: (() => void), reject: ((err: Error) => void)) => {
				console.log('onClearRecentProjectsRequest');

				Utils.clearRecentProjects().then(() => {
					ChainPanelViewUpdater.update(ChainPanelViewUpdater.ChainPanelViewUpdateType.RecentProjects);
					resolve();
				}).catch((err) => {
					vscode.window.showErrorMessage(err.message);
					reject(err);
				});
			});

			chainViewApp.onSetShowOnStartupRequest((showOnStartup: boolean, resolve: (() => void), reject: ((err: Error) => void)) => {
				console.log('onSetShowOnStartupRequest');

				const config = vscode.workspace.getConfiguration('provenance') || <any>{};
				config.update('showHomeOnStartup', showOnStartup, true);

				resolve();
			});
		});
	});

	let geyKeys = vscode.commands.registerCommand(getKeysCommand, () => {
		provenance.getAllKeys().then((keys: Key[]) => {
			console.dir(keys);
		}).catch((err) => {
			vscode.window.showErrorMessage(err.message);
		});
	});

	let instantiateOrMigrate = vscode.commands.registerCommand(instantiateOrMigrateWasmCommand, () => {
		if (isBusy) {
			vscode.window.showWarningMessage('Provenance is currently busy');
		} else {
			isBusy = true;
			instantiateOrMigrateWasm(lastWasmCodeId).then(() => {
				console.log(`Successfully instantiated contract`);
				isBusy = false;
			}).catch((err) => {
				isBusy = false;
				vscode.window.showErrorMessage(err.message);
			});
		}
	});

	let openTerminal = vscode.commands.registerCommand(openTerminalCommand, () => {
		Utils.getTerminal(provenance.settings.clientBinary || "");
	});

	let run = vscode.commands.registerCommand(runWasmCommand, () => {
		Utils.loadProvenanceConfig().then((config: ProvenanceConfig) => {
			runViewApp = RunViewAppBinding.getCodeInstance(runPanelView.showView(`Provenance: ${config.contractLabel}`));
			RunPanelViewUpdater.runViewApp = runViewApp;
			runPanelView.onDispose(() => {
				console.log('runPanelView.onDispose');
				runViewApp.unready();
			});
			runPanelView.onDidChangeViewState(() => {
				console.log('runPanelView.onDidChangeViewState');
				Utils.loadProvenanceConfig().then((config: ProvenanceConfig) => {
					Utils.loadContractFunctions().then((funcs: SmartContractFunctions) => {
						RunPanelViewUpdater.functions = funcs;
						RunPanelViewUpdater.update(config);
					}).catch((err) => {
						vscode.window.showErrorMessage(err.message);
					});
				});
			});

			runViewApp.waitForReady().then(() => {
				Utils.loadProvenanceConfig().then((config: ProvenanceConfig) => {
					Utils.loadContractFunctions().then((funcs: SmartContractFunctions) => {
						console.log('Contract functions loaded');
						RunPanelViewUpdater.functions = funcs;
						RunPanelViewUpdater.update(config);
					}).catch((err) => {
						vscode.window.showErrorMessage(err.message);
					});
				});

				// hook up instantiate contract request handler
				runViewApp.onInstantiateRequest((name: string, args: any, key: (string | undefined), resolve: ((result: any) => void), reject: ((err: Error) => void)) => {
					console.log('onInstantiateRequest');

					// TODO: source repo url from name?
					Utils.loadProvenanceConfig().then((config: ProvenanceConfig) => {
						Utils.getRepoRemoteUrlWithDefault().then((remoteUrl: string) => {
							provenance.getLatestCodeIdBySourceRepo(remoteUrl).then((latestCodeId: number) => {
								console.log(`Latest codeId for ${name} (${remoteUrl}) is ${latestCodeId}`);
								if (latestCodeId == -1) {
									console.log('Instantiating contract...');
								}

								// setup name binding for the contract
								provenance.bindName(config.binding.name, config.binding.root, false).then(() => {
									// instantiate the contract
									provenance.instantiateWasm(latestCodeId, args, name, key).then((result: any) => {
										RunPanelViewUpdater.update(config);
										resolve(result);
									}).catch((err: Error) => {
										reject(err);
									});
								}).catch((err) => {
									reject(err);
								});
							});
						});
					});
				});

				// hook up migrate contract request handler
				runViewApp.onMigrateRequest((addr: string, codeId: number, resolve: (() => void), reject: ((err: Error) => void)) => {
					console.log('onMigrateRequest');

					Utils.loadProvenanceConfig().then((config: ProvenanceConfig) => {
						provenance.getContractByAddress(addr).then((contract) => {
							provenance.migrateWasm(contract, codeId).then(() => {
								RunPanelViewUpdater.update(config);
								resolve();
							}).catch((err) => {
								reject(err);
							});
						}).catch((err) => {
							reject (err);
						});
					});
				});

				// hook up execute function request handler
				runViewApp.onExecuteRequest((addr: (string | undefined), func: SmartContractFunction, args: any, key: (string | undefined), coin: (ExecuteFunctionCoin | undefined), resolve: ((result: any) => void), reject: ((err: Error) => void)) => {
					console.log(`onExecuteRequest ${addr} : ${func.name} as ${key}`);
					
					var execMsg: {[k: string]: any} = {};
					execMsg[func.name] = args;

					Utils.findContract(provenance, addr).then((contract) => {
						var execute_promise;
						if (coin) {
							execute_promise = provenance.executeWithCoin(contract, execMsg, key, coin.amount, coin.denom);
						} else {
							execute_promise = provenance.execute(contract, execMsg, key);
						}
						execute_promise.then((result: any) => {
							resolve(result);
						}).catch((err) => {
							vscode.window.showErrorMessage(err.message);
							reject(err);
						});
					}).catch((err) => {
						vscode.window.showErrorMessage(err.message);
						reject(err);
					});
				});

				// hook up query function request handler
				runViewApp.onQueryRequest((addr: (string | undefined), func: SmartContractFunction, args: any, resolve: ((result: any) => void), reject: ((err: Error) => void)) => {
					console.log(`onQueryRequest ${addr} : ${func.name}`);

					var queryMsg: {[k: string]: any} = {};
					queryMsg[func.name] = args;

					Utils.findContract(provenance, addr).then((contract) => {
						provenance.query(contract, queryMsg).then((result: any) => {
							resolve(result);
						}).catch((err) => {
							vscode.window.showErrorMessage(err.message);
							reject(err);
						});
					}).catch((err) => {
						vscode.window.showErrorMessage(err.message);
						reject(err);
					});
				});
			});
		}).catch((err) => {
			vscode.window.showErrorMessage(err.message);
		});
	});

	let store = vscode.commands.registerCommand(storeWasmCommand, () => {
		if (isBusy) {
			vscode.window.showWarningMessage('Provenance is currently busy');
		} else {
			isBusy = true;
			storeWasm().then((codeId: number) => {
				console.log(`Successfully stored contract with codeId: ${codeId}`);
				isBusy = false;
			}).catch((err) => {
				isBusy = false;
				vscode.window.showErrorMessage(err.message);
			});
		}
	});

	context.subscriptions.push(build);
	context.subscriptions.push(chainUtils);
	context.subscriptions.push(compile);
	context.subscriptions.push(geyKeys);
	context.subscriptions.push(instantiateOrMigrate);
	context.subscriptions.push(openTerminal);
	context.subscriptions.push(run);
	context.subscriptions.push(store);

	// register some listener that make sure the status bar 
	// item always up-to-date
	context.subscriptions.push(leftStatusBarSepItem);
	context.subscriptions.push(provenanceStatusBarItem);
	context.subscriptions.push(compileWasmStatusBarItem);
	context.subscriptions.push(buildWasmStatusBarItem);
	context.subscriptions.push(runWasmStatusBarItem);
	context.subscriptions.push(chainUtilsStatusBarItem);
	context.subscriptions.push(openTerminalStatusBarItem);
	context.subscriptions.push(rightStatusBarSepItem);
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBar));
	context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(updateStatusBar));

	// load the settings
	provenance.loadSettings(true);

	// update status bar item once at start
	updateStatusBar();

	// create the global sate
	globalState = new GlobalState(context);

	// create the Chain View Panel
	chainPanelView = new ChainPanelViewLoader(context.extensionPath, context);

	// create the Run View Panel
	runPanelView = new RunPanelViewLoader(context.extensionPath, context);

	// show chain utils on startup
	const config = vscode.workspace.getConfiguration('provenance') || <any>{};
	var showHomeOnStartup = config.get('showHomeOnStartup');
	if (showHomeOnStartup) {
		vscode.commands.executeCommand(chainUtilsCommand);
	}
}

function updateStatusBar(): void {
	leftStatusBarSepItem.text = '|';
	leftStatusBarSepItem.show();

	provenanceStatusBarItem.text = `Provenance: ${provenance.settings.chainId || '<chain-id not set>'}`;
	provenanceStatusBarItem.show();

	compileWasmStatusBarItem.text = '$(check)';
	compileWasmStatusBarItem.tooltip = 'Compile WASM';
	compileWasmStatusBarItem.show();

	buildWasmStatusBarItem.text = '$(cloud-upload)';
	buildWasmStatusBarItem.tooltip = 'Build, store and instantiate/migrate WASM on Provenance';
	buildWasmStatusBarItem.show();

	runWasmStatusBarItem.text = '$(run)';
	runWasmStatusBarItem.tooltip = 'Run WASM on Provenance';
	runWasmStatusBarItem.show();

	chainUtilsStatusBarItem.text = '$(link)';
	chainUtilsStatusBarItem.tooltip = 'Provenance blockchain utils';
	chainUtilsStatusBarItem.show();

	openTerminalStatusBarItem.text = '$(terminal)';
	openTerminalStatusBarItem.tooltip = 'Open provenanced client terminal';
	openTerminalStatusBarItem.show();

	rightStatusBarSepItem.text = '|';
	rightStatusBarSepItem.show();
}

// this method is called when your extension is deactivated
export function deactivate() {}

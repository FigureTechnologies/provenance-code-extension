import * as vscode from 'vscode';
import * as async from 'async';
import * as child_process from 'child_process';
import { Utils } from './utils'

interface ProvenanceNameBindingConfig {
	name: string,
	root: string
}

interface ProvenanceBuildConfig {
	target: string
}

export interface ProvenanceMarkerConfig {
	denom: string,
	supply: number,
	manager: string,
	privs: MarkerAccess[]
}

export interface ProvenanceEnvConfig {
	keys: string[],
	markers: ProvenanceMarkerConfig[]
}

export interface ProvenanceConfig {
	contractLabel: string
	build: ProvenanceBuildConfig,
	binding: ProvenanceNameBindingConfig,
	initArgs: any,
	env: ProvenanceEnvConfig
}

interface ProvenanceLogMessageAttribute {
	key: string,
	value: string
}

interface ProvenanceLogEvent {
	type: string,
	attributes: ProvenanceLogMessageAttribute[]
}

interface ProvenanceLog {
	msg_index: number,
	log: string,
	events: ProvenanceLogEvent[]
}

export interface ProvenanceCodeInfo {
	code_id: number,
	id: number,
	creator: string,
	data_hash: string,
	source: string,
	builder: string
}

export interface ContractInfo {
	code_id: number,
	creator: string,
	admin: string,
	label: string,
	created: string,
	ibc_port_id: string,
	extension: string
}

export interface Contract {
	address: string,
	contract_info: ContractInfo
}

export interface Key {
	name: string,
	type: string,
	address: string,
	pubkey: string,
	mnemonic: string,
	threshold: number
}

export enum MarkerAccess {
	Admin = 'admin',
    Burn = 'burn',
    Deposit = 'deposit',
    Delete = 'delete',
    Mint = 'mint',
    Transfer = 'transfer',
    Withdraw = 'withdraw'
}

export interface MarkerBaseAccount {
	address: string,
	pub_key: string
}

export interface MarkerAccessControl {
	address: string,
	permissions: string[]
}

export interface Marker {
	base_account: MarkerBaseAccount,
	manager: string,
	access_control: MarkerAccessControl[],
	status: string,
	denom: string,
	supply: number,
	marker_type: string,
	supply_fixed: boolean,
	allow_governance_control: boolean
}

export interface AssetHolding {
	denom: string,
	amount: number
}

class ProvenanceKey implements Key {

	name: string = '';
	type: string = '';
	address: string = '';
	pubkey: string = '';
	mnemonic: string = '';
	threshold: number = 0;

	constructor(keyData: string[]) {
		keyData.forEach((data) => {
			const kvPair = data.trim().split(':');
			kvPair[0] = kvPair[0].trim();
			kvPair[1] = kvPair[1].trim();

			if (kvPair[0] == 'name') {
				this.name = kvPair[1].replaceAll('"', '');
			} else if (kvPair[0] == 'type') {
				this.type = kvPair[1].replaceAll('"', '');
			} else if (kvPair[0] == 'address') {
				this.address = kvPair[1].replaceAll('"', '');
			} else if (kvPair[0] == 'pubkey') {
				this.pubkey = kvPair[1].replaceAll('"', '');
			} else if (kvPair[0] == 'mnemonic') {
				this.mnemonic = kvPair[1].replaceAll('"', '');
			} else if (kvPair[0] == 'threshold') {
				this.threshold = Number(kvPair[1].replaceAll('"', ''));
			}
		});
	}

}

class ProvenanceSettings {
	adminAddress: (string | undefined) = undefined;
	broadcastMode: ('sync' | 'async' | 'block' | undefined) = undefined;
	chainId: (string | undefined) = undefined;
	clientBinary: (string | undefined) = undefined;
	defaultFees: (number | undefined) = 0;
	gasLimit: (number | 'auto' | undefined) = undefined;
	gasAdjustment: (number | undefined) = 1;
	homeDir: (string | undefined) = undefined;
	keyringBackend: (string | undefined) = undefined;
	keyringDirectory: (string | undefined) = undefined;
	nodeHostAddress: (string | undefined) = undefined;
	signingPrivateKey: (string | undefined) = undefined;
	testNet: boolean = false;
}

enum ProvenanceCommand {
	Query = "query",
	Keys = "keys",
	TX = "tx",
}

enum QueryCommand {
	Bank = "bank",
	Marker = "marker"
}

enum KeysCommand {
	Add = "add",
	Delete = "delete",
	Export = "export",
	Import = "import",
	List = "list",
	Migrate = "migrate",
	Mnemonic = "mnemonic",
	Parse = "parse",
	Show = "show",
}

enum TransactionCommand {
	Attribute = "attribute",
	Bank = "bank",
	Broadcast = "broadcast",
	Crisis = "crisis",
	///
	Marker = "marker",
	Name = "name",
	WASM = "wasm",
}

enum WASMTransactionCommand {
	ClearContractAdmin = "clear-contract-admin",
	Execute = "execute",
	Instantiate = "instantiate",
	Migrate = "migrate",
	SetContractAdmin = "set-contract-admin",
	Store = "store",
}

enum WASMQueryCommand {
	ContractState = "contract-state"
}

enum BankQueryCommand {
	Balances = "balances"
}

enum MarkerQueryCommand {
	Get = "get"
}

enum WASMContractStateCommand {
	All = "all",
	Raw = "raw",
	Smart = "smart"
}

enum MarkerTransactionCommand {
	Activate = "activate",
	Finalize = "finalize",
	Grant = "grant",
	New = "new"
}

enum NameTransactionCommand {
	Bind = "bind",
	Delete = "delete"
}

enum ProvenanceClientFlags {
	Admin = "--admin",
	BroadcastMode = "--broadcast-mode",
	ChainId = "--chain-id",
	Fees = "--fees",
	From = "--from",
	Gas = "--gas",
	GasAdjustment = "--gas-adjustment",
	Home = "--home",
	KeyringBackend = "--keyring-backend",
	KeyringDir = "--keyring-dir",
	Node = "--node",
	TestNet = "--testnet",
	Yes = "--yes"
}

export class Provenance {
	storeWasm(wasmFile: string, source: string, builder: string): Promise<number> {
		// reload the settings
		this.loadSettings();

		console.log(`Storing WASM for ${wasmFile} ${source} ${builder}`);

		// build the command
		const command = this.buildCommand([
			ProvenanceCommand.TX, 
			TransactionCommand.WASM, 
			WASMTransactionCommand.Store, 
			wasmFile
		], {}, {
			"--source": source,
			"--builder": builder,
			"--instantiate-only-address": this.getAddressForKey(this.settings.signingPrivateKey || "")
		}, true);

		const promise = new Promise<number>((resolve, reject) => {
			var codeId: number = -1;

			Utils.runCommand(command, (out: string) => {
				var result = JSON.parse(out);
	
				result.logs.forEach((log: ProvenanceLog) => {
					log.events.forEach((event: ProvenanceLogEvent) => {
						if (event.type == 'message') {
							event.attributes.forEach((attr: ProvenanceLogMessageAttribute) => {
								if (codeId == -1 && attr.key == 'code_id') {
									codeId = Number(attr.value);
								}
							});
						}
					});
				});
			}).then (() => {
				resolve(codeId);
			}).catch((err) => {
				reject(new Error("Failed to store the WASM on provenance"));
			});
		});

		return promise;
	}

	instantiateWasm(codeId: number, initArgs: any, label: string): Promise<void> {
		// reload the settings
		this.loadSettings();

		// build the command
		const command = this.buildCommand([
			ProvenanceCommand.TX, 
			TransactionCommand.WASM, 
			WASMTransactionCommand.Instantiate, 
			codeId.toString(),
			JSON.stringify(initArgs)
		], {}, {
			"--label": `${label}`,
			"--admin": this.settings.adminAddress || this.getAddressForKey(this.settings.signingPrivateKey || "")
		}, true);

		const promise = new Promise<void>((resolve, reject) => {
			Utils.runCommand(command).then (() => {
				resolve();
			}).catch((err) => {
				reject(new Error("Failed to instantiate the contract"));
			});
		});

		return promise;
	}

	migrateWasm(contract: Contract, newCodeId: number): Promise<void> {
		// reload the settings
		this.loadSettings();

		// build the command
		const command = this.buildCommand([
			ProvenanceCommand.TX, 
			TransactionCommand.WASM, 
			WASMTransactionCommand.Migrate, 
			contract.address,
			newCodeId.toString(),
			JSON.stringify({ "migrate": { } })
		], {}, {}, true);

		const promise = new Promise<void>((resolve, reject) => {
			Utils.runCommand(command).then (() => {
				resolve();
			}).catch((err) => {
				reject(new Error("Failed to migrate the contract"));
			});
		});

		return promise;
	}

	bindName(name: string, root: string, restrictChildCreation: boolean = true): Promise<void> {
		// reload the settings
		this.loadSettings();

		// build the command
		const command = this.buildCommand([
			ProvenanceCommand.TX, 
			TransactionCommand.Name, 
			NameTransactionCommand.Bind, 
			name,
			this.getAddressForKey(this.settings.signingPrivateKey || ""),
			root,
			`--restrict=${restrictChildCreation ? 'true' : 'false'}`
		], {}, {}, true);

		const promise = new Promise<void>((resolve, reject) => {
			let already_bound = false;
			Utils.runCommand(command, undefined, (err: (string | Buffer)) => {
				if (err.toString().includes('name is already bound')) {
					already_bound = true;
				}
			}).then (() => {
				resolve();
			}).catch((err) => {
				if (already_bound) {
					resolve();
				} else {
					reject(new Error("Failed to bind name"));
				}
			});
		});

		return promise;
	}

	execute(contract: Contract, execMsg: any, key: (string | undefined)): Promise<any> {
		const promise = new Promise<void>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			// use the signing key if provided
			var overrides: {[k: string]: any} = {};
			if (key) {
				overrides[ProvenanceClientFlags.From] = key;
			}

			// build the command
			const command = this.buildCommandArray([
				ProvenanceCommand.TX, 
				TransactionCommand.WASM, 
				WASMTransactionCommand.Execute, 
				contract.address,
				`${JSON.stringify(execMsg)}`
			], overrides, {}, true);

			let result: any = {};
			let result_data: string = '';
			Utils.runCommandWithArray(command, (data: string) => {
				result_data = result_data + data;
			}).then (() => {
				result = JSON.parse(result_data);
				resolve(result);
			}).catch((err) => {
				reject(new Error("Failed to execute the contract"));
			});
		});

		return promise
	}

	query(contract: Contract, queryMsg: any): Promise<any> {
		const promise = new Promise<void>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			// build the command
			const command = this.buildCommand([
				ProvenanceCommand.Query, 
				TransactionCommand.WASM, 
				WASMQueryCommand.ContractState, 
				WASMContractStateCommand.Smart,
				contract.address,
				`${JSON.stringify(queryMsg)}`
			], {}, {
				'-o': 'json'
			}, false, true);

			let result: any = {};
			let result_data: string = '';
			Utils.runCommand(command, (data: string) => {
				result_data = result_data + data;
			}).then (() => {
				result = JSON.parse(result_data);
				resolve(result);
			}).catch((err) => {
				reject(new Error("Failed to query the contract"));
			});
		});

		return promise
	}

	getAllKeys(): Promise<Key[]> {
		return new Promise<Key[]>((resolve, reject) => {
			var provKeys: Key[] = [];

			const listedKeys = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} ${ProvenanceCommand.Keys} ${KeysCommand.List} --home ${this.settings.homeDir} ${this.settings.testNet ? ProvenanceClientFlags.TestNet : ''}`);
			const keys = listedKeys.toString().split('- ');
			keys.forEach((key) => {
				if (key.length > 0) {
					provKeys.push(new ProvenanceKey(key.trim().split(/[\r\n]+/)));
				}
			});

			resolve(provKeys);
		});
	}

	getAddressForKey(key: string): string {
		const address = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} ${ProvenanceCommand.Keys} ${KeysCommand.Show} -a ${key} --home ${this.settings.homeDir} ${this.settings.testNet ? ProvenanceClientFlags.TestNet : ''}`);
		return address.toString().trim();
	}

	doesKeyExist(key: string): boolean {
		let exists: boolean = false;

		try {
			child_process.execSync(`${this.settings.clientBinary || 'provenanced'} ${ProvenanceCommand.Keys} ${KeysCommand.Show} -a ${key} --home ${this.settings.homeDir} ${this.settings.testNet ? ProvenanceClientFlags.TestNet : ''}`);
			exists = true;
		} catch (err) {
		}

		return exists;
	}

	getMarker(denom: string): Promise<Marker> {
		return new Promise<Marker>((resolve, reject) => {
			const marker_info = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} ${ProvenanceCommand.Query} ${QueryCommand.Marker} ${MarkerQueryCommand.Get} ${denom} --home ${this.settings.homeDir} ${this.settings.testNet ? ProvenanceClientFlags.TestNet : ''} -o json`);
			if (!marker_info.toString().includes("invalid marker denom")) {
				const marker_obj: Marker = JSON.parse(marker_info.toString()).marker;
				var marker: Marker = {
					base_account: marker_obj.base_account,
					manager: marker_obj.manager,
					access_control: marker_obj.access_control,
					status: marker_obj.status,
					denom: marker_obj.denom,
					supply: Number(marker_obj.supply),
					marker_type: marker_obj.marker_type,
					supply_fixed: marker_obj.supply_fixed,
					allow_governance_control: marker_obj.allow_governance_control
				};
				resolve(marker);
			} else {
				reject(new Error(`Marker ${denom} does not exist`));
			}
		});
	}

	doesMarkerExist(denom: string): boolean {
		let exists: boolean = false;

		try {
			const marker_info = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} ${ProvenanceCommand.Query} ${QueryCommand.Marker} ${MarkerQueryCommand.Get} ${denom} --home ${this.settings.homeDir} ${this.settings.testNet ? ProvenanceClientFlags.TestNet : ''}`);
			if (!marker_info.toString().includes("invalid marker denom")) {
				exists = true;
			}
		} catch (err) {
		}

		return exists;
	}

	getLatestCodeIdByContractLabel(label: string): Promise<number> {
		const promise = new Promise<number>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			let latestCodeId: number = -1;

			const codeList = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} query wasm list-code -o json`);
			const codeInfos: ProvenanceCodeInfo[] = JSON.parse(codeList.toString()).code_infos;
			if (codeInfos) {
				codeInfos.forEach((codeInfo: ProvenanceCodeInfo) => {
					//console.dir(codeInfo);
					const contractList = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} query wasm list-contract-by-code ${codeInfo.code_id ? codeInfo.code_id : codeInfo.id} -o json`);
					const contractAddresses: string[] = JSON.parse(contractList.toString()).contracts;
					if (contractAddresses) {
						contractAddresses.forEach((contractAddress: string) => {
							//console.dir(contractAddress);
							const contractData = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} query wasm contract ${contractAddress} ${this.settings.testNet ? ProvenanceClientFlags.TestNet : ''} -o json`);
							const contract: Contract = JSON.parse(contractData.toString());
							//console.dir(contract);

							if (contract.contract_info.label == label) {
								latestCodeId = (contract.contract_info.code_id > latestCodeId ? contract.contract_info.code_id : latestCodeId);
							}
						})
					}
				});

				resolve(latestCodeId);
			} else {
				resolve(-1);
			}
		});

		return promise;
	}

	getContractByCodeId(codeId: number): (Contract | undefined) {
		let foundContract = undefined;

		const contractList = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} query wasm list-contract-by-code ${codeId} -o json`);
		const contractAddresses: string[] = JSON.parse(contractList.toString()).contracts;
		if (contractAddresses) {
			contractAddresses.forEach((contractAddress: string) => {
				const contractData = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} query wasm contract ${contractAddress} ${this.settings.testNet ? ProvenanceClientFlags.TestNet : ''} -o json`);
				const contract: Contract = JSON.parse(contractData.toString());

				if (contract.contract_info.code_id == codeId) {
					foundContract = contract;
				}
			});
		}

		return foundContract;
	}

	getContractByContractLabel(label: string): Promise<Contract> {
		return new Promise<Contract>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			let foundContract: (Contract | undefined) = undefined;

			const codeList = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} query wasm list-code -o json`);
			const codeInfos: ProvenanceCodeInfo[] = JSON.parse(codeList.toString()).code_infos;
			if (codeInfos) {
				codeInfos.forEach((codeInfo: ProvenanceCodeInfo) => {
					//console.dir(codeInfo);
					const contractList = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} query wasm list-contract-by-code ${codeInfo.code_id ? codeInfo.code_id : codeInfo.id} -o json`);
					const contractAddresses: string[] = JSON.parse(contractList.toString()).contracts;
					if (contractAddresses) {
						contractAddresses.forEach((contractAddress: string) => {
							//console.dir(contractAddress);
							const contractData = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} query wasm contract ${contractAddress} ${this.settings.testNet ? ProvenanceClientFlags.TestNet : ''} -o json`);
							const contract: Contract = JSON.parse(contractData.toString());
							//console.dir(contract);

							if (contract.contract_info.label == label) {
								foundContract = contract;
							}
						})
					}
				});

				if (foundContract) {
					resolve(foundContract);
				} else {
					reject(new Error(`Unable to locate contract '${label}'`));
				}
			} else {
				reject(new Error(`Unable to locate contract '${label}'`));
			}
		});
	}

	getAccountBalances(address: string): Promise<AssetHolding[]> {
		return new Promise<AssetHolding[]>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			// build the command
			const command = this.buildCommand([
				ProvenanceCommand.Query, 
				QueryCommand.Bank, 
				BankQueryCommand.Balances,
				address
			], {}, {
				'-o': 'json'
			}, false, true);

			let assets: AssetHolding[] = [];
			let result_data: string = '';
			Utils.runCommand(command, (data: string) => {
				result_data = result_data + data;
			}).then (() => {
				const result = JSON.parse(result_data);
				result.balances.forEach((balance: any) => {
					assets.push({
						denom: balance.denom,
						amount: Number(balance.amount)
					});
				});
				resolve(assets);
			}).catch((err) => {
				reject(new Error("Failed to query account balances"));
			});
		});
	}

	createKey(name: string): Promise<Key> {
		return new Promise<Key>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			const HD_PATH = `"44'/1'/0'/0/0"`;

			try {
				const key = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} ${ProvenanceCommand.Keys} ${KeysCommand.Add} ${name} --hd-path ${HD_PATH} --home ${this.settings.homeDir} ${this.settings.testNet ? ProvenanceClientFlags.TestNet : ''}`);
				var newKey = new ProvenanceKey(key.toString().replace('- ', '').trim().split(/[\r\n]+/));
				resolve(newKey);
			} catch (err) {
				reject(new Error(`Failed to create key ${name}`));
			}
		});
	}

	newMarker(denom: string, supply: number, manager: string): Promise<void> {
		// reload the settings
		this.loadSettings();

		// use the manager signing key
		var overrides: {[k: string]: any} = {};
		overrides[ProvenanceClientFlags.From] = manager;

		// build the command
		const command = this.buildCommand([
			ProvenanceCommand.TX, 
			TransactionCommand.Marker, 
			MarkerTransactionCommand.New, 
			`${supply}${denom}`,
			'--type COIN'
		], overrides, {}, true);

		const promise = new Promise<void>((resolve, reject) => {
			let marker_added = false;
			Utils.runCommand(command, (out: string) => {
				var result = JSON.parse(out);
	
				result.logs.forEach((log: ProvenanceLog) => {
					log.events.forEach((event: ProvenanceLogEvent) => {
						if (event.type == 'provenance.marker.v1.EventMarkerAdd') {
							marker_added = true;
						}
					});
				});
			}).then (() => {
				if (marker_added) {
					resolve();
				} else {
					reject(new Error(`Failed to add new marker ${denom}`));
				}
			}).catch((err) => {
				reject(new Error(`Failed to add new marker ${denom}`));
			});
		});

		return promise;
	}

	grantMarkerPriv(denom: string, manager: string, priv: MarkerAccess): Promise<void> {
		// reload the settings
		this.loadSettings();

		const manager_key = this.getAddressForKey(manager);

		// use the manager signing key
		var overrides: {[k: string]: any} = {};
		overrides[ProvenanceClientFlags.From] = manager;

		// build the command
		const command = this.buildCommand([
			ProvenanceCommand.TX, 
			TransactionCommand.Marker, 
			MarkerTransactionCommand.Grant, 
			manager_key,
			denom,
			priv.toString()
		], overrides, {}, true);

		const promise = new Promise<void>((resolve, reject) => {
			let marker_granted = false;
			Utils.runCommand(command, (out: string) => {
				var result = JSON.parse(out);
	
				result.logs.forEach((log: ProvenanceLog) => {
					log.events.forEach((event: ProvenanceLogEvent) => {
						if (event.type == 'provenance.marker.v1.EventMarkerAddAccess') {
							marker_granted = true;
						}
					});
				});
			}).then (() => {
				if (marker_granted) {
					resolve();
				} else {
					reject(new Error(`Failed to add grant ${priv.toString()} on marker ${denom}`));
				}
			}).catch((err) => {
				reject(new Error(`Failed to add grant ${priv.toString()} on marker ${denom}`));
			});
		});

		return promise;
	}

	grantMarkerPrivs(denom: string, manager: string, privs: MarkerAccess[]): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			async.eachSeries(privs, (priv, callback) => {
				this.grantMarkerPriv(denom, manager, priv).then(() => {
					callback();
				}).catch((err) => {
					callback(err);
				});
			}, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	finalizeMarker(denom: string, manager: string): Promise<void> {
		// reload the settings
		this.loadSettings();

		// use the manager signing key
		var overrides: {[k: string]: any} = {};
		overrides[ProvenanceClientFlags.From] = manager;

		// build the command
		const command = this.buildCommand([
			ProvenanceCommand.TX, 
			TransactionCommand.Marker, 
			MarkerTransactionCommand.Finalize, 
			denom
		], overrides, {}, true);

		const promise = new Promise<void>((resolve, reject) => {
			let marker_granted = false;
			Utils.runCommand(command, (out: string) => {
				var result = JSON.parse(out);
	
				result.logs.forEach((log: ProvenanceLog) => {
					log.events.forEach((event: ProvenanceLogEvent) => {
						if (event.type == 'provenance.marker.v1.EventMarkerFinalize') {
							marker_granted = true;
						}
					});
				});
			}).then (() => {
				if (marker_granted) {
					resolve();
				} else {
					reject(new Error(`Failed to finalize marker ${denom}`));
				}
			}).catch((err) => {
				reject(new Error(`Failed to finalize marker ${denom}`));
			});
		});

		return promise;
	}

	activateMarker(denom: string, manager: string): Promise<void> {
		// reload the settings
		this.loadSettings();

		// use the manager signing key
		var overrides: {[k: string]: any} = {};
		overrides[ProvenanceClientFlags.From] = manager;

		// build the command
		const command = this.buildCommand([
			ProvenanceCommand.TX, 
			TransactionCommand.Marker, 
			MarkerTransactionCommand.Activate, 
			denom
		], overrides, {}, true);

		const promise = new Promise<void>((resolve, reject) => {
			let marker_granted = false;
			Utils.runCommand(command, (out: string) => {
				var result = JSON.parse(out);
	
				result.logs.forEach((log: ProvenanceLog) => {
					log.events.forEach((event: ProvenanceLogEvent) => {
						if (event.type == 'provenance.marker.v1.EventMarkerActivate') {
							marker_granted = true;
						}
					});
				});
			}).then (() => {
				if (marker_granted) {
					resolve();
				} else {
					reject(new Error(`Failed to activate marker ${denom}`));
				}
			}).catch((err) => {
				reject(new Error(`Failed to activate marker ${denom}`));
			});
		});

		return promise;
	}

	createMarker(denom: string, supply: number, manager: string, privs: MarkerAccess[]): Promise<Marker> {
		return new Promise<Marker>((resolve, reject) => {
			async.series([
				(callback) => {
					this.newMarker(denom, supply, manager).then(() => {
						callback();
					}).catch((err) => {
						callback(err);
					});
				},
				(callback) => {
					this.grantMarkerPrivs(denom, manager, privs).then(() => {
						callback();
					}).catch((err) => {
						callback(err);
					});
				},
				(callback) => {
					this.finalizeMarker(denom, manager).then(() => {
						callback();
					}).catch((err) => {
						callback(err);
					});
				},
				(callback) => {
					this.activateMarker(denom, manager).then(() => {
						callback();
					}).catch((err) => {
						callback(err);
					});
				}
			], (err, results) => {
				if (err) {
					reject(err);
				} else {
					this.getMarker(denom).then((marker) => {
						console.dir(marker);
						resolve(marker);
					}).catch((err) => {
						reject(err);
					});
				}
			});
		});
	}

	withdrawCoin(denom: string, amount: number, manager: string, recipient: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			// TODO
		});

		/*
			./build/provenanced tx marker withdraw \
				test.omni.usd \
				1000000000test.omni.usd \
				$(./build/provenanced keys show -a warehouse --testnet --home  /Users/koryherzinger/.provenance/build/node0) \   	<<< RECIPIENT
				--from omnibus \   																									<<< MANAGER
				--chain-id chain-local \
				--gas auto \
				--fees 2000nhash \
				--broadcast-mode block \
				--testnet \
				--home /Users/koryherzinger/.provenance/build/node0 \
				--yes
		*/
	}

	recoverKeyFromMnemonic(name: string, mnemonic: string): Promise<Key> {
		return new Promise<Key>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			// TODO

			reject(new Error('Unimplemented'));
		});
	}

	private buildCommand(commands: string[], overrides: {[k: string]: any} = {}, args: any = {}, skipPrompt: boolean = true, isQuery: boolean = false): string {
		return this.buildCommandArray(commands, overrides, args, skipPrompt, isQuery).join(' ');
	}

	private buildCommandArray(commands: string[], overrides: {[k: string]: any} = {}, args: any = {}, skipPrompt: boolean = true, isQuery: boolean = false): string[] {
		let cmd: string[] = [];

		// the provenanced client
		cmd.push(this.settings.clientBinary || 'provenanced');

		// add the base command and the subcommands
		commands.forEach((command) => {
			cmd.push(command);
		});

		// add the subcommand specific arguments
		for (let key in args) {
			cmd.push(key);
			cmd.push(args[key]);
		}

		// add the generic arguments
		if (!isQuery) {
			var adminAddress = this.settings.adminAddress;
			if (ProvenanceClientFlags.Admin in overrides) {
				adminAddress = overrides[ProvenanceClientFlags.Admin];
			}
			if (adminAddress) { cmd.push(ProvenanceClientFlags.Admin); cmd.push(adminAddress); }

			var broadcastMode = this.settings.broadcastMode;
			if (ProvenanceClientFlags.BroadcastMode in overrides) {
				broadcastMode = overrides[ProvenanceClientFlags.BroadcastMode];
			}
			if (broadcastMode) { cmd.push(ProvenanceClientFlags.BroadcastMode); cmd.push(broadcastMode); }
		}

		var chainId = this.settings.chainId;
		if (ProvenanceClientFlags.ChainId in overrides) {
			chainId = overrides[ProvenanceClientFlags.ChainId];
		}
		if (chainId) { cmd.push(ProvenanceClientFlags.ChainId); cmd.push(chainId); }

		if (!isQuery) {
			var defaultFees = this.settings.defaultFees;
			if (ProvenanceClientFlags.Fees in overrides) {
				defaultFees = overrides[ProvenanceClientFlags.Fees];
			}
			if (defaultFees) { cmd.push(ProvenanceClientFlags.Fees); cmd.push(`${defaultFees.toString()}nhash`); }

			var gasLimit = this.settings.gasLimit;
			if (ProvenanceClientFlags.Gas in overrides) {
				gasLimit = overrides[ProvenanceClientFlags.Gas];
			}
			if (gasLimit) { cmd.push(ProvenanceClientFlags.Gas); cmd.push(gasLimit.toString()); }

			var gasAdjustment = this.settings.gasAdjustment;
			if (ProvenanceClientFlags.GasAdjustment in overrides) {
				gasAdjustment = overrides[ProvenanceClientFlags.GasAdjustment];
			}
			if (gasAdjustment) { cmd.push(ProvenanceClientFlags.GasAdjustment); cmd.push(gasAdjustment.toString()); }
		}

		var homeDir = this.settings.homeDir;
		if (ProvenanceClientFlags.Home in overrides) {
			homeDir = overrides[ProvenanceClientFlags.Home];
		}
		if (homeDir) { cmd.push(ProvenanceClientFlags.Home); cmd.push(homeDir); }

		if (!isQuery) {
			var keyringBackend = this.settings.keyringBackend;
			if (ProvenanceClientFlags.KeyringBackend in overrides) {
				keyringBackend = overrides[ProvenanceClientFlags.KeyringBackend];
			}
			if (keyringBackend) { cmd.push(ProvenanceClientFlags.KeyringBackend); cmd.push(keyringBackend); }

			var keyringDirectory = this.settings.keyringDirectory;
			if (ProvenanceClientFlags.KeyringDir in overrides) {
				keyringDirectory = overrides[ProvenanceClientFlags.KeyringDir];
			}
			if (keyringDirectory) { cmd.push(ProvenanceClientFlags.KeyringDir); cmd.push(keyringDirectory); }
		}

		var nodeHostAddress = this.settings.nodeHostAddress;
		if (ProvenanceClientFlags.Node in overrides) {
			nodeHostAddress = overrides[ProvenanceClientFlags.Node];
		}
		if (nodeHostAddress) { cmd.push(ProvenanceClientFlags.Node); cmd.push(nodeHostAddress); }

		if (!isQuery) {
			var signingPrivateKey = this.settings.signingPrivateKey;
			if (ProvenanceClientFlags.From in overrides) {
				signingPrivateKey = overrides[ProvenanceClientFlags.From];
			}
			if (signingPrivateKey) { cmd.push(ProvenanceClientFlags.From); cmd.push(signingPrivateKey); }
		}

		// add flags
		if (this.settings.testNet) { cmd.push(ProvenanceClientFlags.TestNet); }
		if (skipPrompt && !isQuery) { cmd.push(ProvenanceClientFlags.Yes); }

		return cmd;
	}

	loadSettings(dumpToConsole: boolean = false) {
		const config = vscode.workspace.getConfiguration('provenance') || <any>{};
		this.settings.adminAddress = config.get('adminAddress');
		this.settings.broadcastMode = config.get('broadcastMode');
		this.settings.chainId = config.get('chainId');
		this.settings.clientBinary = config.get('clientBinary');
		this.settings.defaultFees = config.get('defaultFees');
		this.settings.gasLimit = config.get('gasLimit');
		this.settings.gasAdjustment = config.get('gasAdjustment');
		this.settings.homeDir = config.get('homeDir');
		this.settings.keyringBackend = config.get('keyringBackend');
		this.settings.keyringDirectory = config.get('keyringDirectory');
		this.settings.nodeHostAddress = config.get('nodeHostAddress');
		this.settings.signingPrivateKey = config.get('signingPrivateKey')
		this.settings.testNet = config.get('testNet') || false;

		if (dumpToConsole) {
			console.log('Provenance Settings:');
			console.log(`  provenance.adminAddress = ${this.settings.adminAddress || "<unset>"}`);
			console.log(`  provenance.broadcastMode = ${this.settings.broadcastMode || "<unset>"}`);
			console.log(`  provenance.chainId = ${this.settings.chainId || "<unset>"}`);
			console.log(`  provenance.clientBinary = ${this.settings.clientBinary || "<unset>"}`);
			console.log(`  provenance.defaultFees = ${this.settings.defaultFees?.toString() || "<unset>"}`);
			console.log(`  provenance.gasLimit = ${this.settings.gasLimit || "<unset>"}`);
			console.log(`  provenance.gasAdjustment = ${this.settings.gasAdjustment || "<unset>"}`);
			console.log(`  provenance.homeDir = ${this.settings.homeDir || "<unset>"}`);
			console.log(`  provenance.keyringBackend = ${this.settings.keyringBackend || "<unset>"}`);
			console.log(`  provenance.keyringDirectory = ${this.settings.keyringDirectory || "<unset>"}`);
			console.log(`  provenance.nodeHostAddress = ${this.settings.nodeHostAddress || "<unset>"}`);
			console.log(`  provenance.signingPrivateKey = ${this.settings.signingPrivateKey || "<unset>"}`);
			console.log(`  provenance.testNet = ${this.settings.testNet.toString() || "<unset>"}`);
		}
	}

	settings: ProvenanceSettings = new ProvenanceSettings();
}
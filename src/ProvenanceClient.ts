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

export interface ProvenanceMarkerGrant {
	key: string,
	privs: MarkerAccess[]
}

export interface ProvenanceMarkerConfig {
	denom: string,
	supply: number,
	manager: string,
	type: string,
	grants: ProvenanceMarkerGrant[]
}

export interface ProvenanceKeyConfig {
	name: string,
	minHash: number,
	initialHash: number
}

export interface ProvenanceEnvConfig {
	keys: ProvenanceKeyConfig[],
	markers: ProvenanceMarkerConfig[]
}

export interface ProvenanceConfig {
	contractLabel: string
	build: ProvenanceBuildConfig,
	binding: ProvenanceNameBindingConfig,
	initArgs: any,
	isSingleton: boolean,
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

export enum MarkerType {
	Coin = 'COIN',
	Restricted = 'RESTRICTED'
}

export enum MarkerStatus {
	Active = "MARKER_STATUS_ACTIVE",
	Cancelled = "MARKER_STATUS_CANCELLED",
	Destroyed = "MARKER_STATUS_DESTROYED",
	Proposed = "MARKER_STATUS_PROPOSED"
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
	Get = "get",
	List = "list"
}

enum WASMContractStateCommand {
	All = "all",
	Raw = "raw",
	Smart = "smart"
}

enum BankTransactionCommand {
	Send = "send"
}

enum MarkerTransactionCommand {
	Activate = "activate",
	Burn = "burn",
	Cancel = "cancel",
	Destroy = "destroy",
	Finalize = "finalize",
	Grant = "grant",
	Mint = "mint",
	New = "new",
	Revoke = "revoke",
	Withdraw = "withdraw"
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

	instantiateWasm(codeId: number, initArgs: any, label: string, from: (string | undefined) = undefined): Promise<any> {
		const promise = new Promise<any>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			// use the from signing key
			var overrides: {[k: string]: any} = {};
			if (from) {
				overrides[ProvenanceClientFlags.From] = this.getAddressForKey(from);
			}

			// build the command
			const command = this.buildCommand([
				ProvenanceCommand.TX, 
				TransactionCommand.WASM, 
				WASMTransactionCommand.Instantiate, 
				codeId.toString(),
				JSON.stringify(initArgs)
			], overrides, {
				"--label": `${label}`,
				"--admin": this.settings.adminAddress || this.getAddressForKey(this.settings.signingPrivateKey || "")
			}, true);
			
			let result: any = {};
			let result_data: string = '';
			Utils.runCommand(command, (data: string) => {
				result_data = result_data + data;
			}).then (() => {
				result = JSON.parse(result_data);
				resolve(result);
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

	executeWithCoin(contract: Contract, execMsg: any, key: (string | undefined), amount: number, denom: string): Promise<any> {
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
			], overrides, {
				'--amount': `${amount.toString()}${denom}`
			}, true);

			let result: any = {};
			let result_data: string = '';
			Utils.runCommandWithArray(command, (data: string) => {
				result_data = result_data + data;
			}).then (() => {
				result = JSON.parse(result_data);
				resolve(result);
			}).catch((err) => {
				reject(new Error("Failed to execute the contract with coin"));
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

	isKey(key: string): boolean {
		return ((key.startsWith('tp') || key.startsWith('pb')) && key.length == 41);
	}

	getAddressForKey(key: string): string {
		if (this.isKey(key)) {
			return key;
		} else {
			const address = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} ${ProvenanceCommand.Keys} ${KeysCommand.Show} -a ${key} --home ${this.settings.homeDir} ${this.settings.testNet ? ProvenanceClientFlags.TestNet : ''}`);
			return address.toString().trim();
		}
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

	getAllMarkers(): Promise<Marker[]> {
		return new Promise<Marker[]>((resolve, reject) => {
			var provMarkers: Marker[] = [];

			const listedMarkers = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} ${ProvenanceCommand.Query} ${QueryCommand.Marker} ${MarkerQueryCommand.List} --home ${this.settings.homeDir} ${this.settings.testNet ? ProvenanceClientFlags.TestNet : ''} -o json`);
			const marker_objs: Marker[] = JSON.parse(listedMarkers.toString()).markers;
			marker_objs.forEach((marker_obj) => {
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
				provMarkers.push(marker);
			});

			resolve(provMarkers);
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

	getMarkerAddress(denom: string): string {
		var marker_addr: string = '';

		const marker_info = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} ${ProvenanceCommand.Query} ${QueryCommand.Marker} ${MarkerQueryCommand.Get} ${denom} --home ${this.settings.homeDir} ${this.settings.testNet ? ProvenanceClientFlags.TestNet : ''} -o json`);
		if (!marker_info.toString().includes("invalid marker denom")) {
			const marker_obj: Marker = JSON.parse(marker_info.toString()).marker;
			marker_addr = marker_obj.base_account.address;
		}

		return marker_addr;
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

	getLatestCodeIdBySourceRepo(repo: string): Promise<number> {
		const promise = new Promise<number>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			let latestCodeId: number = -1;

			const codeList = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} query wasm list-code -o json`);
			const codeInfos: ProvenanceCodeInfo[] = JSON.parse(codeList.toString()).code_infos;
			if (codeInfos) {
				codeInfos.forEach((codeInfo: ProvenanceCodeInfo) => {
					if (codeInfo.source.toLocaleLowerCase() == repo.toLocaleLowerCase()) {
						latestCodeId = (codeInfo.code_id > latestCodeId ? codeInfo.code_id : latestCodeId);
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
					reject(new Error(`Unable to locate contract by label '${label}'`));
				}
			} else {
				reject(new Error(`Unable to locate contract by label '${label}'`));
			}
		});
	}

	getContractByAddress(addr: string): Promise<Contract> {
		return new Promise<Contract>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			this.getAllContracts().then((contracts) => {
				var foundContract: (Contract | undefined) = contracts.find((contract) => { return (contract.address == addr); });
				if (foundContract) {
					resolve(foundContract);
				} else {
					reject(new Error(`Unable to locate contract by address '${addr}'`));
				}
			}).catch((err) => {
				reject(err);
			});
		});
	}

	getAllContracts(): Promise<Contract[]> {
		return new Promise<Contract[]>((resolve, reject) => {
			var contracts: Contract[] = [];

			// reload the settings
			this.loadSettings();

			const codeList = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} query wasm list-code -o json`);
			const codeInfos: ProvenanceCodeInfo[] = JSON.parse(codeList.toString()).code_infos;
			if (codeInfos) {
				codeInfos.forEach((codeInfo: ProvenanceCodeInfo) => {
					const contractList = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} query wasm list-contract-by-code ${codeInfo.code_id ? codeInfo.code_id : codeInfo.id} -o json`);
					const contractAddresses: string[] = JSON.parse(contractList.toString()).contracts;
					if (contractAddresses) {
						contractAddresses.forEach((contractAddress: string) => {
							const contractData = child_process.execSync(`${this.settings.clientBinary || 'provenanced'} query wasm contract ${contractAddress} ${this.settings.testNet ? ProvenanceClientFlags.TestNet : ''} -o json`);
							const contract: Contract = JSON.parse(contractData.toString());
							if (contract) {
								contracts.push(contract);
							}
						});
					}
				});
			}

			resolve(contracts);
		});
	}

	getAllContractsByContractLabel(label: string): Promise<Contract[]> {
		return new Promise<Contract[]>((resolve, reject) => {
			this.getAllContracts().then((contracts) => {
				var found_contracts = contracts.filter((contract) => { return (contract.contract_info.label == label); });
				resolve(found_contracts);
			}).catch((err) => {
				reject(err);
			});
		});
	};

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
				child_process.exec(`${this.settings.clientBinary || 'provenanced'} ${ProvenanceCommand.Keys} ${KeysCommand.Add} ${name} --hd-path ${HD_PATH} --home ${this.settings.homeDir} ${this.settings.testNet ? ProvenanceClientFlags.TestNet : ''}`, (err, stdout, stderr) => {
					var newKey = new ProvenanceKey(stdout.replace('- ', '').trim().split(/[\r\n]+/));
					var mnemonic = '';
					stderr.split(/[\r\n]+/).forEach((line) => {
						if (line.length > 0) {
							mnemonic = line;
						}
					});
					newKey.mnemonic = mnemonic
					resolve(newKey);
				});
			} catch (err) {
				reject(new Error(`Failed to create key ${name}`));
			}
		});
	}

	recoverKey(name: string, mnemonic: string): Promise<Key> {
		return new Promise<Key>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			const HD_PATH = `"44'/1'/0'/0/0"`;

			try {
				child_process.exec(`echo "${mnemonic}" | ${this.settings.clientBinary || 'provenanced'} ${ProvenanceCommand.Keys} ${KeysCommand.Add} ${name} --hd-path ${HD_PATH} --recover --home ${this.settings.homeDir} ${this.settings.testNet ? ProvenanceClientFlags.TestNet : ''}`, (err, stdout, stderr) => {
					var recoveredKey = new ProvenanceKey(stdout.replace('- ', '').trim().split(/[\r\n]+/));
					resolve(recoveredKey);
				});
			} catch (err) {
				reject(new Error(`Failed to recover key ${name}`));
			}
		});
	}

	deleteKey(name: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			try {
				child_process.execSync(`${this.settings.clientBinary || 'provenanced'} ${ProvenanceCommand.Keys} ${KeysCommand.Delete} ${name} --home ${this.settings.homeDir} ${this.settings.testNet ? ProvenanceClientFlags.TestNet : ''} --yes`);
				resolve();
			} catch (err) {
				reject(new Error(`Failed to delete key ${name}`));
			}
		});
	}

	newMarker(denom: string, supply: number, manager: string, type: MarkerType): Promise<void> {
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
			`--type ${type}`
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

	grantMarkerPriv(denom: string, key: string, priv: MarkerAccess, admin: string): Promise<void> {
		// reload the settings
		this.loadSettings();

		const key_addr = this.getAddressForKey(key);
		const admin_addr = this.getAddressForKey(admin);

		// use the admin signing key
		var overrides: {[k: string]: any} = {};
		overrides[ProvenanceClientFlags.From] = admin_addr;

		// build the command
		const command = this.buildCommand([
			ProvenanceCommand.TX, 
			TransactionCommand.Marker, 
			MarkerTransactionCommand.Grant, 
			key_addr,
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

	grantMarkerPrivs(denom: string, key: string, privs: MarkerAccess[], admin: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			async.eachSeries(privs, (priv: MarkerAccess, callback) => {
				this.grantMarkerPriv(denom, key, priv, admin).then(() => {
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

	revokeMarkerPrivs(denom: string, key: string, admin: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			const key_addr = this.getAddressForKey(key);
			const admin_addr = this.getAddressForKey(admin);

			// use the admin signing key
			var overrides: {[k: string]: any} = {};
			overrides[ProvenanceClientFlags.From] = admin_addr;

			// build the command
			const command = this.buildCommand([
				ProvenanceCommand.TX, 
				TransactionCommand.Marker, 
				MarkerTransactionCommand.Revoke, 
				key_addr,
				denom
			], overrides, {}, true);

			let marker_revoked = false;
			Utils.runCommand(command, (out: string) => {
				var result = JSON.parse(out);
	
				result.logs.forEach((log: ProvenanceLog) => {
					log.events.forEach((event: ProvenanceLogEvent) => {
						if (event.type == 'provenance.marker.v1.EventMarkerDeleteAccess') {
							marker_revoked = true;
						}
					});
				});
			}).then (() => {
				if (marker_revoked) {
					resolve();
				} else {
					reject(new Error(`Failed to revoke grant for key ${key} on marker ${denom}`));
				}
			}).catch((err) => {
				reject(new Error(`Failed to revoke grant for key ${key} on marker ${denom}`));
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

	createMarker(denom: string, supply: number, manager: string, type: MarkerType, grants: ProvenanceMarkerGrant[]): Promise<Marker> {
		return new Promise<Marker>((resolve, reject) => {
			async.series([
				(callback) => {
					this.newMarker(denom, supply, manager, type).then(() => {
						callback();
					}).catch((err) => {
						callback(err);
					});
				},
				(callback) => {
					async.eachSeries(grants, (grant: ProvenanceMarkerGrant, series_callback) => {
						this.grantMarkerPrivs(denom, grant.key, grant.privs, manager).then(() => {
							series_callback();
						}).catch((err) => {
							series_callback(err);
						});
					}, (err) => {
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

	cancelMarker(denom: string, who: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			// use the provided signing key
			var overrides: {[k: string]: any} = {};
			overrides[ProvenanceClientFlags.From] = who;

			// build the command
			const command = this.buildCommand([
				ProvenanceCommand.TX, 
				TransactionCommand.Marker, 
				MarkerTransactionCommand.Cancel, 
				denom
			], overrides, {}, true);

			let marker_cancelled = false;
			Utils.runCommand(command, (out: string) => {
				var result = JSON.parse(out);
	
				result.logs.forEach((log: ProvenanceLog) => {
					log.events.forEach((event: ProvenanceLogEvent) => {
						if (event.type == 'provenance.marker.v1.EventMarkerCancel') {
							marker_cancelled = true;
						}
					});
				});
			}).then (() => {
				if (marker_cancelled) {
					resolve();
				} else {
					reject(new Error(`Failed to cancel marker ${denom}`));
				}
			}).catch((err) => {
				reject(new Error(`Failed to cancel marker ${denom}`));
			});
		});
	}

	destroyMarker(denom: string, who: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			// use the provided signing key
			var overrides: {[k: string]: any} = {};
			overrides[ProvenanceClientFlags.From] = who;

			// build the command
			const command = this.buildCommand([
				ProvenanceCommand.TX, 
				TransactionCommand.Marker, 
				MarkerTransactionCommand.Destroy, 
				denom
			], overrides, {}, true);

			let marker_destroyed = false;
			Utils.runCommand(command, (out: string) => {
				var result = JSON.parse(out);
	
				result.logs.forEach((log: ProvenanceLog) => {
					log.events.forEach((event: ProvenanceLogEvent) => {
						if (event.type == 'provenance.marker.v1.EventMarkerDelete') {
							marker_destroyed = true;
						}
					});
				});
			}).then (() => {
				if (marker_destroyed) {
					resolve();
				} else {
					reject(new Error(`Failed to destroy marker ${denom}`));
				}
			}).catch((err) => {
				reject(new Error(`Failed to destroy marker ${denom}`));
			});
		});
	}

	deleteMarker(denom: string, who: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.getMarker(denom).then((marker) => {
				async.series([
					(callback) => {
						if (marker.status == MarkerStatus.Cancelled) {
							// marker already cancelled
							callback();
						} else {
							this.cancelMarker(denom, who).then(() => {
								callback();
							}).catch((err) => {
								callback(err);
							});
						}
					},
					(callback) => {
						this.destroyMarker(denom, who).then(() => {
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
			}).catch((err) => {
				reject(err);
			});
		});
	}

	mintCoin(denom: string, amount: number, sender: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			// use the sender signing key
			var overrides: {[k: string]: any} = {};
			overrides[ProvenanceClientFlags.From] = this.getAddressForKey(sender);

			// build the command
			const command = this.buildCommand([
				ProvenanceCommand.TX, 
				TransactionCommand.Marker, 
				MarkerTransactionCommand.Mint, 
				`${amount}${denom}`
			], overrides, {}, true);

			let coin_minted = false;
			Utils.runCommand(command, (out: string) => {
				var result = JSON.parse(out);
	
				result.logs.forEach((log: ProvenanceLog) => {
					log.events.forEach((event: ProvenanceLogEvent) => {
						if (event.type == 'provenance.marker.v1.EventMarkerMint') {
							coin_minted = true;
						}
					});
				});
			}).then (() => {
				if (coin_minted) {
					resolve();
				} else {
					reject(new Error(`Failed to mint coin ${amount} ${denom}`));
				}
			}).catch((err) => {
				reject(new Error(`Failed to mint coin ${amount} ${denom}`));
			});
		});
	}

	burnCoin(denom: string, amount: number, sender: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			// use the sender signing key
			var overrides: {[k: string]: any} = {};
			overrides[ProvenanceClientFlags.From] = this.getAddressForKey(sender);

			// build the command
			const command = this.buildCommand([
				ProvenanceCommand.TX, 
				TransactionCommand.Marker, 
				MarkerTransactionCommand.Burn, 
				`${amount}${denom}`
			], overrides, {}, true);

			let coin_minted = false;
			Utils.runCommand(command, (out: string) => {
				var result = JSON.parse(out);
	
				result.logs.forEach((log: ProvenanceLog) => {
					log.events.forEach((event: ProvenanceLogEvent) => {
						if (event.type == 'provenance.marker.v1.EventMarkerBurn') {
							coin_minted = true;
						}
					});
				});
			}).then (() => {
				if (coin_minted) {
					resolve();
				} else {
					reject(new Error(`Failed to burn coin ${amount} ${denom}`));
				}
			}).catch((err) => {
				reject(new Error(`Failed to burn coin ${amount} ${denom}`));
			});
		});
	}

	withdrawCoin(denom: string, amount: number, recipient: string, sender: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			// use the sender signing key
			var overrides: {[k: string]: any} = {};
			overrides[ProvenanceClientFlags.From] = this.getAddressForKey(sender);

			// build the command
			const command = this.buildCommand([
				ProvenanceCommand.TX, 
				TransactionCommand.Marker, 
				MarkerTransactionCommand.Withdraw, 
				denom,
				`${amount}${denom}`,
				this.getAddressForKey(recipient)
			], overrides, {}, true);
			
			let coin_withdrawn = false;
			Utils.runCommand(command, (out: string) => {
				var result = JSON.parse(out);
	
				result.logs.forEach((log: ProvenanceLog) => {
					log.events.forEach((event: ProvenanceLogEvent) => {
						if (event.type == 'provenance.marker.v1.EventMarkerWithdraw') {
							coin_withdrawn = true;
						}
					});
				});
			}).then (() => {
				if (coin_withdrawn) {
					resolve();
				} else {
					reject(new Error(`Failed to withdraw coin ${denom} to ${recipient}`));
				}
			}).catch((err) => {
				reject(new Error(`Failed to withdraw coin ${denom} to ${recipient}`));
			});
		});
	}

	sendCoin(denom: string, amount: number, recipient: string, sender: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			// reload the settings
			this.loadSettings();

			// use the sender signing key
			var overrides: {[k: string]: any} = {};
			overrides[ProvenanceClientFlags.From] = this.getAddressForKey(sender);

			// build the command
			const command = this.buildCommand([
				ProvenanceCommand.TX, 
				TransactionCommand.Bank, 
				BankTransactionCommand.Send, 
				this.getAddressForKey(sender),
				this.getAddressForKey(recipient),
				`${amount}${denom}`
			], overrides, {}, true);

			let coin_sent = false;
			Utils.runCommand(command, (out: string) => {
				var result = JSON.parse(out);
	
				result.logs.forEach((log: ProvenanceLog) => {
					log.events.forEach((event: ProvenanceLogEvent) => {
						if (event.type == 'transfer') {
							coin_sent = true;
						}
					});
				});
			}).then (() => {
				if (coin_sent) {
					resolve();
				} else {
					reject(new Error(`Failed to send coin ${denom} from ${sender} to ${recipient}`));
				}
			}).catch((err) => {
				reject(new Error(`Failed to send coin ${denom} from ${sender} to ${recipient}`));
			});
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
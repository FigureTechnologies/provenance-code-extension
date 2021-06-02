<div align="center">
<img src="./media/logo.png" alt="Provenance"/>
</div>
<br/><br/>

# Provenance Visual Studio Code Extension

[Provenance] is a distributed, proof of stake blockchain designed for the financial services industry.

For more information about [Provenance Inc](https://provenance.io) visit https://provenance.io

[provenance]: https://provenance.io/#overview

## Features

The Provenance Visual Studio Code extension provides an all-in-one development environment for developing ProvWASM smart contracts:

* Compile smart contract web assembly code from Makefile.
* Stores/instantiates/migrates WASM code on the blockchain.
* Dynamically generated UI for executing transactions and running queries against the smart contract.

## Requirements

### Rust Toolchain

Install Rust:
```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Configure the shell:
```sh
source $HOME/.cargo/env
```

Ensure the stable toolchain is used by default:
```sh
rustup default stable
```

Add the wasm32 target:
```sh
rustup target add wasm32-unknown-unknown
```

Install the cargo-generate crate:
```sh
cargo install cargo-generate --features vendored-openssl
```

### Go 1.15+

Download and install the Go runtime from [here](https://golang.org/dl/).

### Provenance Client + Local Network

Clone, build and start a local network using the instructions found [here](https://github.com/provenance-io/provenance).

## Extension Settings

This extension contributes the following provenance client settings:

* `provenance.adminAddress`: Address of an admin (--admin).
* `provenance.broadcastMode`: Transaction broadcasting mode (--broadcast-mode).
* `provenance.chainId`: The network chain ID (--chain-id).
* `provenance.clientBinary`: The path to the provenanced client binary.
* `provenance.defaultFees`: Default fees to pay along with transaction in nhash (--fees).
* `provenance.gasLimit`: Gas limit to set per-transaction. Set to 'auto' to calculate sufficient gas automatically (--gas).
* `provenance.gasAdjustment`: Adjustment factor to be multiplied against the estimate returned by the tx simulation (--gas-adjustment).
* `provenance.homeDir`: Local directory for config and data. Defaults to '~/Library/Application Support/Provenance' (--home).
* `provenance.keyringBackend`: The keyring's backend (--keyring-backend).
* `provenance.keyringDirectory`: The client Keyring directory. If omitted, the default 'home' directory will be used (--keyring-dir).
* `provenance.nodeHostAddress`: Node host address (tcp://<host>:<port>) to tendermint rpc interface for this chain (--node).
* `provenance.signingPrivateKey`: Name or address of private key with which to sign transaction (--from).
* `provenance.testNet`: Indicates this command should use the testnet configuration (--test-net).

## Known Issues

* The builder function for running contracts currently does not support object or array data types. For now, use the JSON function to construct complex messages for transactions/queries.
* The extension is still fairly new and lacks some features.

## Release Notes

### 0.0.1

* Initial release.
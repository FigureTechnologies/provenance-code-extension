import * as React from "react";
import './provenance-accounts-view.scss';
import { FaArrowUp, FaPlus, FaTrashAlt } from 'react-icons/fa';
import Dialog from 'react-bootstrap-dialog';

import { Breadcrumb, Button, Card, OverlayTrigger, Table, Tooltip } from 'react-bootstrap';
import { Alert, ChainViewAppBinding } from './app-binding';
import { ProvenanceKey } from './provenance-key';
import { ProvenanceAccountBalance } from './provenance-account-balance';
import { Utils } from './app-utils';

import AccountDetailsView from './account-details-view';
import AddKeyModal from './add-key-modal';
import RecoverKeyModal from './recover-key-modal';

interface ProvenanceAccountDetails {
    key: ProvenanceKey,
    balances: ProvenanceAccountBalance[]
}

interface ProvenanceAccountsViewProps {
    appBinding: ChainViewAppBinding,
    accountKeys: ProvenanceKey[]
}

interface ProvenanceAccountsViewState {
    accountDetails: (ProvenanceAccountDetails | undefined),
    recoverKeyModalShown: boolean,
    addKeyModalShown: boolean
}

export default class ProvenanceAccountsView extends React.Component<ProvenanceAccountsViewProps, ProvenanceAccountsViewState> {

    constructor(props: any) {
        super(props);

        this.state = {
            accountDetails: undefined,
            recoverKeyModalShown: false,
            addKeyModalShown: false
        };
    }

    confirmDeleteDialog: Dialog;

    render() {
        const keys = this.props.accountKeys;

        const isAccountDetailsShown = () => {
            return (this.state.accountDetails != undefined);
        }

        const showAccountDetails = (k) => {
            this.props.appBinding.getAccountBalances(k.address).then((balances) => {
                this.setState({
                    accountDetails: {
                        key: k,
                        balances: balances
                    }
                });
            }).catch((err) => {
                // TODO: set error message
            });
        };

        const deleteKey = (k) => {
            this.confirmDeleteDialog.show({
                title: 'Confirm delete key',
                body: `Are you sure you want to delete the key "${k.name}"?`,
                bsSize: 'small',
                actions: [
                    Dialog.OKAction(() => {
                        Utils.deleteKey(k.name).catch((err) => {
                            Utils.showAlert(Alert.Danger, `Unable to delete key "${k.name}"`, err.message, true);
                        });
                    }),
                    Dialog.CancelAction()
                ]
            });
        };

        const goHome = () => {
            this.setState({
                accountDetails: undefined
            });
        };

        const showRecoverKeyModal = () => {
            this.setState({
                recoverKeyModalShown: true
            });
        };

        const hideRecoverKeyModal = () => {
            this.setState({
                recoverKeyModalShown: false
            });
        };

        const showAddKeyModal = () => {
            this.setState({
                addKeyModalShown: true
            });
        };

        const hideAddKeyModal = () => {
            this.setState({
                addKeyModalShown: false
            });
        };

        const renderRecoverKeyTooltip = (props) => (
            <Tooltip id="recover-button-tooltip" {...props}>Recover key from mnemonic</Tooltip>
        );

        const renderAddKeyTooltip = (props) => (
            <Tooltip id="add-button-tooltip" {...props}>New key/account</Tooltip>
        );

        const renderDeleteKeyTooltip = (props) => (
            <Tooltip id="delete-button-tooltip" {...props}>Delete key</Tooltip>
        );

        return (
            <React.Fragment>
                <Breadcrumb>
                    <Breadcrumb.Item href="#" onClick={() => goHome()} active={!isAccountDetailsShown()}>Keys &#38; Accounts</Breadcrumb.Item>
                    { isAccountDetailsShown() && <Breadcrumb.Item active={isAccountDetailsShown()}>{this.state.accountDetails.key.address}</Breadcrumb.Item> }
                </Breadcrumb>
                { !isAccountDetailsShown() &&
                    <Card className="tableCard">
                        <Card.Header>
                            <OverlayTrigger
                                placement="bottom"
                                delay={{ show: 250, hide: 400 }}
                                overlay={renderAddKeyTooltip}
                            >
                                <Button 
                                    variant="primary" 
                                    size="sm" 
                                    className="float-right mr-1" 
                                    onClick={() => showAddKeyModal()}
                                >
                                        <FaPlus />
                                </Button>
                            </OverlayTrigger>
                            <OverlayTrigger
                                placement="bottom"
                                delay={{ show: 250, hide: 400 }}
                                overlay={renderRecoverKeyTooltip}
                            >
                                <Button 
                                    variant="primary" 
                                    size="sm" 
                                    className="float-right mr-1" 
                                    onClick={() => showRecoverKeyModal()}
                                >
                                        <FaArrowUp />
                                </Button>
                            </OverlayTrigger>
                        </Card.Header>
                        <Card.Body>
                            <Table striped bordered hover responsive variant="dark" size="sm">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Address</th>
                                        <th>&nbsp;</th>
                                    </tr>
                                </thead>
                                <tbody className="accountTableField noselect">
                                    {keys.map((key, idx) =>
                                        <tr key={key.name}>
                                            <td>{key.name}</td>
                                            <td>{key.type}</td>
                                            <td><a href="#" onClick={() => showAccountDetails(key)}>{key.address}</a></td>
                                            <td>
                                                <OverlayTrigger
                                                    placement="right"
                                                    delay={{ show: 250, hide: 400 }}
                                                    overlay={renderDeleteKeyTooltip}
                                                >
                                                    <a href="#" className="actions" onClick={() => deleteKey(key)}><FaTrashAlt /></a>
                                                </OverlayTrigger>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                }
                { isAccountDetailsShown() && <AccountDetailsView accountKey={this.state.accountDetails.key} accountBalances={this.state.accountDetails.balances}></AccountDetailsView> }
                <RecoverKeyModal
                    show={this.state.recoverKeyModalShown}
                    onCancel={() => hideRecoverKeyModal()}
                    onKeyRecovered={(key) => { 
                        hideRecoverKeyModal();
                        Utils.showAlert(Alert.Success, `Recovered key "${key.name}" from mnemonic`, `Address: ${key.address}\nPublic key: ${key.pubkey}`, true);
                    }}
                    onError={(err) => {
                        Utils.showAlert(Alert.Danger, `Unable to recover key from mnemonic`, err.message, true);
                    }}
                ></RecoverKeyModal>
                <AddKeyModal
                    show={this.state.addKeyModalShown}
                    onCancel={() => hideAddKeyModal()}
                    onKeyCreated={(key) => { 
                        hideAddKeyModal();
                        Utils.showAlert(Alert.Success, `Created new key "${key.name}"`, `**Important** write this mnemonic phrase in a safe place.\nIt is the only way to recover your account if you ever forget your password.\n\n${key.mnemonic}`, true);
                    }}
                    onError={(err) => {
                        Utils.showAlert(Alert.Danger, `Unable to create new key`, err.message, true);
                    }}
                ></AddKeyModal>
                <Dialog ref={(el) => { this.confirmDeleteDialog = el }} />
            </React.Fragment>
        );
    }

}

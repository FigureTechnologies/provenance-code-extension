import * as React from "react";
import './provenance-accounts-view.scss';
import { FaPlus } from 'react-icons/fa';

import { Breadcrumb, Button, Card, OverlayTrigger, Table, Tooltip } from 'react-bootstrap';
import { ChainViewAppBinding } from './app-binding';
import { ProvenanceKey } from './provenance-key';
import { ProvenanceAccountBalance } from './provenance-account-balance';

import AccountDetailsView from './account-details-view';
import AddKeyModal from './add-key-modal';

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
    addKeyModalShown: boolean
}

export default class ProvenanceAccountsView extends React.Component<ProvenanceAccountsViewProps, ProvenanceAccountsViewState> {

    constructor(props: any) {
        super(props);

        this.state = {
            accountDetails: undefined,
            addKeyModalShown: false
        };
    }

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

        const goHome = () => {
            this.setState({
                accountDetails: undefined
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

        const renderAddKeyTooltip = (props) => (
            <Tooltip id="button-tooltip" {...props}>New key/account</Tooltip>
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
                                    className="float-right" 
                                    onClick={() => showAddKeyModal()}
                                >
                                        <FaPlus />
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
                                    </tr>
                                </thead>
                                <tbody className="accountTableField noselect">
                                    {keys.map((key, idx) =>
                                        <tr>
                                            <td>{key.name}</td>
                                            <td>{key.type}</td>
                                            <td><a href="#" onClick={() => showAccountDetails(key)}>{key.address}</a></td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                }
                { isAccountDetailsShown() && <AccountDetailsView accountKey={this.state.accountDetails.key} accountBalances={this.state.accountDetails.balances}></AccountDetailsView> }
                <AddKeyModal show={this.state.addKeyModalShown} onCancel={() => hideAddKeyModal() }></AddKeyModal>
            </React.Fragment>
        );
    }

}

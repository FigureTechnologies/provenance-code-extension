import * as React from "react";
import './account-details-view.scss';

import { Card, Col, Container, OverlayTrigger, Row, Table, Tooltip } from 'react-bootstrap';
import { FaArrowCircleRight } from 'react-icons/fa';
import { Alert } from './app-binding';
import { ProvenanceAccountBalance } from './provenance-account-balance';
import { ProvenanceKey } from './provenance-key';
import { Utils } from './app-utils';

import SendCoinModal from './send-coin-modal';

interface AccountDetailsViewProps {
    accountKey: ProvenanceKey,
    allKeys: ProvenanceKey[],
    accountBalances: ProvenanceAccountBalance[],
    onRefresh: (() => void)
}

interface AccountDetailsViewState {
    sendCoinModalShown: boolean,
    sendCoinDenom: string
}

export default class AccountDetailsView extends React.Component<AccountDetailsViewProps, AccountDetailsViewState> {

    constructor(props: any) {
        super(props);

        this.state = {
            sendCoinModalShown: false,
            sendCoinDenom: undefined
        };
    }

    render() {
        const keys = this.props.allKeys;
        const key = this.props.accountKey;
        const balances = this.props.accountBalances;

        const sendCoins = (d) => {
            showSendCoinModal(d);
        };

        const showSendCoinModal = (denom: string) => {
            this.setState({
                sendCoinModalShown: true,
                sendCoinDenom: denom
            });
        };

        const hideSendCoinModal = () => {
            this.setState({
                sendCoinModalShown: false
            });
        };

        const renderSendCoinsTooltip = (props) => (
            <Tooltip id="send-button-tooltip" {...props}>Send</Tooltip>
        );

        return (
            <React.Fragment>
                <Card className="detailsCard">
                    <Card.Header>Account Details</Card.Header>
                    <Card.Body>
                        <Container>
                            <Row>
                                <Col sm={3}>Name:</Col>
                                <Col sm={9} className="accountDetailsField">{key.name}</Col>
                            </Row>
                            <Row>
                                <Col sm={3}>Address:</Col>
                                <Col sm={9} className="accountDetailsField">{key.address}</Col>
                            </Row>
                            <Row>
                                <Col sm={3}>Account Type:</Col>
                                <Col sm={9} className="accountDetailsField">{key.type}</Col>
                            </Row>
                            <Row>
                                <Col sm={3}>Public Key:</Col>
                                <Col sm={9} className="accountDetailsField">{key.pubkey}</Col>
                            </Row>
                        </Container>
                    </Card.Body>
                </Card>
                <br />
                <Card className="detailsCard">
                    <Card.Header>Account Balances</Card.Header>
                    <Card.Body>
                    { (balances.length == 0) && <div className="noAssetsMarkers">No Assets/Markers</div> }
                        { (balances.length > 0) && <Table striped bordered hover responsive variant="dark" size="sm">
                            <thead>
                                <tr>
                                    <th>Denom</th>
                                    <th>Balance</th>
                                    <th>&nbsp;</th>
                                </tr>
                            </thead>
                            <tbody className="accountDetailsField noselect">
                                {balances.map((balance, idx) =>
                                    <tr>
                                        <td>{balance.denom}</td>
                                        <td>{balance.amount}</td>
                                        <td>
                                            {balance.amount > 0 && <OverlayTrigger
                                                placement="bottom"
                                                delay={{ show: 250, hide: 400 }}
                                                overlay={renderSendCoinsTooltip}
                                            >
                                                <span className="accountAction"><a href="#" className="actions" onClick={() => sendCoins(balance.denom)}><FaArrowCircleRight /></a></span>
                                            </OverlayTrigger>}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table> }
                    </Card.Body>
                </Card>
                <SendCoinModal
                    show={this.state.sendCoinModalShown}
                    keys={keys}
                    denom={this.state.sendCoinDenom}
                    sender={this.props.accountKey.address}
                    onCancel={() => hideSendCoinModal()}
                    onCoinSent={(denom, total, address) => {
                        hideSendCoinModal();
                        this.props.onRefresh();
                        Utils.showAlert(Alert.Success, `Successfully sent coin(s)`, `Sent ${total} ${denom} coins to ${address}`, true);
                    }}
                    onError={(err) => {
                        Utils.showAlert(Alert.Danger, `Unable to send coin(s)`, err.message, true);
                    }}
                ></SendCoinModal>
            </React.Fragment>
        );
    }
}

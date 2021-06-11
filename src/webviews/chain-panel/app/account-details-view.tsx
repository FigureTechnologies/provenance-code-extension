import * as React from "react";
import './account-details-view.scss';

import { Card, Col, Container, Row, Table } from 'react-bootstrap';
import { ProvenanceAccountBalance } from './provenance-account-balance';
import { ProvenanceKey } from './provenance-key';

interface AccountDetailsViewProps {
    accountKey: ProvenanceKey,
    accountBalances: ProvenanceAccountBalance[]
}

export default class AccountDetailsView extends React.Component<AccountDetailsViewProps> {

    constructor(props: any) {
        super(props);

        this.state = {
            accountKey: undefined,
            accountBalances: []
        }
    }

    render() {
        const key = this.props.accountKey;
        const balances = this.props.accountBalances;

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
                                </tr>
                            </thead>
                            <tbody className="accountDetailsField noselect">
                                {balances.map((balance, idx) =>
                                    <tr>
                                        <td>{balance.denom}</td>
                                        <td>{balance.amount}</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table> }
                    </Card.Body>
                </Card>
            </React.Fragment>
        );
    }
}

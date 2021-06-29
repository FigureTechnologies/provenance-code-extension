import * as React from "react";
import { Button, ButtonGroup, Card, Col, Container, Dropdown, DropdownButton, Row } from 'react-bootstrap';
import { FaPlay, FaSpinner } from 'react-icons/fa';

import { SmartContractInfo } from './smart-contract-info';
import { SigningKey } from './signing-key';

import './smart-contract-instantiate-view.scss';

interface SmartContractInstantiateViewProps {
    contractInfo: SmartContractInfo,
    signingKeys: SigningKey[]
}

interface SmartContractInstantiateViewState {
    busy: boolean,
    signingKey: string
}

export default class SmartContractFunctionView extends React.Component<SmartContractInstantiateViewProps, SmartContractInstantiateViewState> {

    constructor(props: any) {
        super(props);

        this.instantiateSmartContract = this.instantiateSmartContract.bind(this);

        this.state = {
            busy: false,
            signingKey: (props.signingKeys[0] ? props.signingKeys[0].name : '')
        };
    }

    render() {
        const renderRunButtonContents = () => {
            if (!this.state.busy) {
                return <span><FaPlay /></span>;
            } else {
                return <span><FaSpinner className="spinner" /></span>;
            }
        }

        const renderRunButtons = () => {
            const keys = this.props.signingKeys;

            return <ButtonGroup className="float-right">
                <Button variant="primary" type="button" disabled={this.state.busy} onClick={this.instantiateSmartContract}>
                    {renderRunButtonContents()}
                </Button>
                <DropdownButton as={ButtonGroup} variant="secondary" disabled={this.state.busy} title={this.state.signingKey}>
                    {keys.map((key, idx) =>
                        <Dropdown.Item onSelect={setSigningKey} eventKey={key.name}>{key.name}</Dropdown.Item>
                    )}
                </DropdownButton>
            </ButtonGroup>;
        }

        const setSigningKey = (k) => {
            this.setState({ signingKey: k });
        };

        return (
            <React.Fragment>
                <Card className="scInstantiate">
                    <Card.Header>Instantiate Contract</Card.Header>
                    <Card.Body>
                        <Container className="sectionHeader" >
                            <Row className="clearfix align-items-center">
                                <Col sm={3}><h5 className="sectionHeaderTitle">Arguments</h5></Col>
                                <Col>{renderRunButtons()}</Col>
                            </Row>
                        </Container>
                        <hr className="scFunctionHR"/>
                    </Card.Body>
                </Card>
            </React.Fragment>
        );
    }

    private instantiateSmartContract() {
        console.log(`Instantiate smart contract: ${this.props.contractInfo.name}`);

        this.setState({ 
            busy: true
        });

        // TODO
    }

}

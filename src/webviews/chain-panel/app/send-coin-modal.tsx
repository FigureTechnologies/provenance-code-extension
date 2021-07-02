import * as React from "react";
import './send-coin-modal.scss';

import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { ProvenanceKey } from './provenance-key';
import { Utils } from './app-utils';

interface ValidationInfo {
    isValid: boolean,
    isValidated: boolean,
    error: (string | undefined)
}

interface SendCoinModalProps {
    show: boolean,
    keys: ProvenanceKey[],
    denom: string,
    sender: string,
    onCancel: (() => void),
    onCoinSent: ((denom: string, total: number, address: string) => void),
    onError: ((err: Error) => void)
}

interface SendCoinModalState {
    isBusy: boolean,
    formValid: boolean,
    formValidated: boolean,
    sendToAddressValidation: ValidationInfo,
    totalToSendValidation: ValidationInfo
}

export default class SendCoinModal extends React.Component<SendCoinModalProps, SendCoinModalState> {

    constructor(props: any) {
        super(props);

        this.state = {
            isBusy: false,
            formValid: false,
            formValidated: false,
            sendToAddressValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            },
            totalToSendValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            }
        };

        this.sendCoin = this.sendCoin.bind(this);
    }

    _input_sendToAddress;
    _input_totalToSend;

    reset() {
        this.setState({
            isBusy: false,
            formValid: false,
            formValidated: false,
            sendToAddressValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            },
            totalToSendValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            }
        });
    }

    render() {
        const keys = this.props.keys;
        const sender = this.props.sender;

        const validateSendToAddress = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            if (!value.startsWith('tp') && !value.startsWith('pb')) {
                validationInfo.isValid = false;
                validationInfo.error = "Address looks invalid";
            } else if (value.length != 41) {
                validationInfo.isValid = false;
                validationInfo.error = "Address looks invalid";
            }

            this.setState({
                formValid: validationInfo.isValid && this.state.totalToSendValidation.isValid,
                formValidated: validationInfo.isValidated && this.state.totalToSendValidation.isValidated,
                sendToAddressValidation: validationInfo
            });
        }

        const validateTotalToSend = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            if (isNaN(+value)) {
                validationInfo.isValid = false;
                validationInfo.error = `Total coin to send must be numeric`;
            } else if (value.length == 0) {
                validationInfo.isValid = false;
                validationInfo.error = `Total coin to send is required`;
            }

            this.setState({
                formValid: validationInfo.isValid && this.state.sendToAddressValidation.isValid,
                formValidated: validationInfo.isValidated && this.state.sendToAddressValidation.isValidated,
                totalToSendValidation: validationInfo
            });
        }

        const keysCanSendTo = (keys, sender) => {
            var foundKeys: ProvenanceKey[] = [];

            keys.forEach((key) => {
                if (key.address != sender) {
                    foundKeys.push(key);
                }
            });

            return foundKeys;
        }

        return (
            <React.Fragment>
                <Modal
                    {...this.props}
                    size="lg"
                    aria-labelledby="contained-modal-title-vcenter"
                    centered
                    onHide={() => { if (!this.state.isBusy) this.props.onCancel(); }}
                    onEnter={() => this.reset()}
                    className="sendCoinModal"
                >
                    <Modal.Header closeButton={!this.state.isBusy}>
                        <Modal.Title id="contained-modal-title-vcenter">Send Coin</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group as={Row} controlId="send-to">
                                <Form.Label column sm={3}>Send to</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        custom
                                        as="select"
                                        placeholder=""
                                        ref={(c) => this._input_sendToAddress = c}
                                        onChange={e => validateSendToAddress(e.currentTarget.value)}
                                        isInvalid={!this.state.sendToAddressValidation.isValid}
                                        disabled={this.state.isBusy}
                                    >
                                        {keysCanSendTo(keys, sender).map((key, idx) =>
                                            <option value={key.address}>{key.name} ({key.address})</option>
                                        )}
                                    </Form.Control>
                                    <Form.Control.Feedback type="invalid">{this.state.sendToAddressValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="coin">
                                <Form.Label column sm={3}>Total</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        type="number"
                                        placeholder=""
                                        ref={(c) => this._input_totalToSend = c}
                                        onChange={e => validateTotalToSend(e.currentTarget.value)}
                                        isInvalid={!this.state.totalToSendValidation.isValid}
                                        disabled={this.state.isBusy}
                                    />
                                    <Form.Control.Feedback type="invalid">{this.state.totalToSendValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button 
                            variant="primary" 
                            onClick={this.sendCoin} 
                            disabled={this.state.isBusy || (!this.state.formValidated || !this.state.formValid)}
                        >
                            { this.state.isBusy ? <span><Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                /> Sending Coin...</span>
                            : <span>Send Coin</span>}
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={() => this.props.onCancel() } 
                            disabled={this.state.isBusy}
                        >
                            Cancel
                        </Button>
                    </Modal.Footer>
                </Modal>
            </React.Fragment>
        );
    }

    private sendCoin() {
        this.setState({ isBusy: true });

        const totalToSend = Number(this._input_totalToSend.value as string);
        const sendTo = this._input_sendToAddress.value as string;

        Utils.sendCoin(this.props.denom, totalToSend, sendTo, this.props.sender).then(() => {
            this.setState({ isBusy: false });
            this.props.onCoinSent(this.props.denom, totalToSend, sendTo);
        }).catch((err) => {
            this.setState({ isBusy: false });
            this.props.onError(err);
        });
    }

}
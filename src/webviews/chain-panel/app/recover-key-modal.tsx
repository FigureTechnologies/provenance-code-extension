import * as React from "react";
import './recover-key-modal.scss';

import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { ProvenanceKey } from './provenance-key';
import { Utils } from './app-utils';

interface ValidationInfo {
    isValid: boolean,
    isValidated: boolean,
    error: (string | undefined)
}

interface RecoverKeyModalProps {
    show: boolean,
    onCancel: (() => void),
    onKeyRecovered: ((key: ProvenanceKey) => void)
    onError: ((err: Error) => void)
}

interface RecoverKeyModalState {
    isBusy: boolean,
    formValid: boolean,
    formValidated: boolean,
    keyNameValidation: ValidationInfo,
    keyMnemonicValidation: ValidationInfo
}

export default class RecoverKeyModal extends React.Component<RecoverKeyModalProps, RecoverKeyModalState> {

    constructor(props: any) {
        super(props);

        this.state = {
            isBusy: false,
            formValid: false,
            formValidated: false,
            keyNameValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            },
            keyMnemonicValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            }
        };

        this.recoverKey = this.recoverKey.bind(this);
    }

    _input_keyName;
    _input_keyMnemonic;

    reset() {
        this.setState({
            isBusy: false,
            formValid: false,
            formValidated: false,
            keyNameValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            },
            keyMnemonicValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            }
        });
    }

    render() {
        const validateKeyName = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            if (value.includes(' ')) {
                validationInfo.isValid = false;
                validationInfo.error = "Key name cannot include spaces";
            } else if (value.length == 0) {
                validationInfo.isValid = false;
                validationInfo.error = "Key name required";
            }

            this.setState({
                formValid: validationInfo.isValid && this.state.keyMnemonicValidation.isValid,
                formValidated: validationInfo.isValidated && this.state.keyMnemonicValidation.isValidated,
                keyNameValidation: validationInfo
            });
        }

        const validateKeyMnemonic = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            if (value.length == 0) {
                validationInfo.isValid = false;
                validationInfo.error = "Key mnemonic required";
            }

            this.setState({
                formValid: validationInfo.isValid && this.state.keyNameValidation.isValid,
                formValidated: validationInfo.isValidated && this.state.keyNameValidation.isValidated,
                keyMnemonicValidation: validationInfo
            });
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
                    className="recoverKeyModal"
                >
                    <Modal.Header closeButton={!this.state.isBusy}>
                        <Modal.Title id="contained-modal-title-vcenter">Recover Key from Mnemonic</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form noValidate validated={this.state.formValidated}>
                            <Form.Group as={Row} controlId="name">
                                <Form.Label column sm={3}>Key name</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        type="text"
                                        placeholder=""
                                        ref={(c) => this._input_keyName = c}
                                        onChange={e => validateKeyName(e.currentTarget.value)}
                                        isInvalid={!this.state.keyNameValidation.isValid}
                                        disabled={this.state.isBusy}
                                    />
                                    <Form.Control.Feedback type="invalid">{this.state.keyNameValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="mnemonic">
                                <Form.Label column sm={3}>Key mnemonic</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        type="text"
                                        placeholder=""
                                        ref={(c) => this._input_keyMnemonic = c}
                                        onChange={e => validateKeyMnemonic(e.currentTarget.value)}
                                        isInvalid={!this.state.keyMnemonicValidation.isValid}
                                        disabled={this.state.isBusy}
                                    />
                                    <Form.Control.Feedback type="invalid">{this.state.keyMnemonicValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button 
                            variant="primary" 
                            onClick={this.recoverKey} 
                            disabled={this.state.isBusy || (!this.state.formValidated || !this.state.formValid)}
                        >
                            { this.state.isBusy ? <span><Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                /> Recovering Key...</span>
                            : <span>Recover Key</span>}
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={() => this.props.onCancel()}
                            disabled={this.state.isBusy}
                        >
                            Cancel
                        </Button>
                    </Modal.Footer>
                </Modal>
            </React.Fragment>
        );
    }

    private recoverKey() {
        this.setState({ isBusy: true });

        const keyName = this._input_keyName.value as string;
        const keyMnemonic = this._input_keyMnemonic.value as string;
        Utils.recoverKey(keyName, keyMnemonic).then((key: (ProvenanceKey | undefined)) => {
            this.setState({ isBusy: false });
            if (key) {
                this.props.onKeyRecovered(key);
            } else {
                this.props.onError(new Error(`Unknown error recovering key ${keyName}`));
            }
        }).catch((err) => {
            this.setState({ isBusy: false });
            this.props.onError(err);
        });
    }

}

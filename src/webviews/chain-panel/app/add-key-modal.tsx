import * as React from "react";
import './add-key-modal.scss';

import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { ProvenanceKey } from './provenance-key';
import { Utils } from './app-utils';

interface ValidationInfo {
    isValid: boolean,
    error: (string | undefined)
}

interface AddKeyModalProps {
    show: boolean,
    onCancel: (() => void),
    onKeyCreated: ((key: ProvenanceKey) => void),
    onError: ((err: Error) => void)
}

interface AddKeyModalState {
    formValid: boolean,
    formValidated: boolean,
    keyNameValidation: ValidationInfo
}

export default class AddKeyModal extends React.Component<AddKeyModalProps, AddKeyModalState> {

    constructor(props: any) {
        super(props);

        this.state = {
            formValid: false,
            formValidated: false,
            keyNameValidation: {
                isValid: true,
                error: undefined
            }
        };

        this.createKey = this.createKey.bind(this);
    }

    _input_keyName;

    reset() {
        this.setState({
            formValid: false,
            formValidated: false,
            keyNameValidation: {
                isValid: true,
                error: undefined
            }
        });
    }

    render() {
        const validateKeyName = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
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
                formValid: validationInfo.isValid,
                formValidated: true,
                keyNameValidation: validationInfo
            });
        }

        return (
            <React.Fragment>
                <Modal
                    {...this.props}
                    size="lg"
                    aria-labelledby="contained-modal-title-vcenter"
                    centered
                    onHide={() => this.props.onCancel()}
                    onEnter={() => this.reset()}
                    className="addKeyModal"
                >
                    <Modal.Header closeButton>
                        <Modal.Title id="contained-modal-title-vcenter">Create New Key</Modal.Title>
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
                                    />
                                    <Form.Control.Feedback type="invalid">{this.state.keyNameValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="primary" onClick={this.createKey} disabled={!this.state.formValid}>Create Key</Button>
                        <Button variant="secondary" onClick={() => this.props.onCancel()}>Cancel</Button>
                    </Modal.Footer>
                </Modal>
            </React.Fragment>
        );
    }

    private createKey() {
        const keyName = this._input_keyName.value as string;
        Utils.createKey(keyName).then((key: (ProvenanceKey | undefined)) => {
            if (key) {
                this.props.onKeyCreated(key);
            } else {
                this.props.onError(new Error(`Unknown error creating key ${keyName}`));
            }
        }).catch((err) => {
            this.props.onError(err);
        });
    }
}

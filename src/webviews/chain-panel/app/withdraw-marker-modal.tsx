import * as React from "react";
import './withdraw-marker-modal.scss';

import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { ProvenanceKey } from './provenance-key';
import { ProvenanceMarker } from './provenance-marker';
import { Utils } from './app-utils';

interface ValidationInfo {
    isValid: boolean,
    isValidated: boolean,
    error: (string | undefined)
}

interface WithdrawMarkerModalProps {
    show: boolean,
    keys: ProvenanceKey[],
    marker: ProvenanceMarker,
    onCancel: (() => void),
    onMarkerWithdrawn: ((marker: ProvenanceMarker, total: number, address: string) => void),
    onError: ((err: Error) => void)
}

interface WithdrawMarkerModalState {
    isBusy: boolean,
    formValid: boolean,
    formValidated: boolean,
    showManualAddress: boolean,
    signerValidation: ValidationInfo,
    totalToWithdrawValidation: ValidationInfo,
    withdrawToAddressValidation: ValidationInfo,
    manualAddressValidation: ValidationInfo
}

export class WithdrawMarkerModal extends React.Component<WithdrawMarkerModalProps, WithdrawMarkerModalState> {

    constructor(props: any) {
        super(props);

        this.state = {
            isBusy: false,
            formValid: false,
            formValidated: false,
            showManualAddress: false,
            signerValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            },
            totalToWithdrawValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            },
            withdrawToAddressValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            },
            manualAddressValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            }
        };

        this.withdrawMarker = this.withdrawMarker.bind(this);
    }

    _input_signer;
    _input_totalToWithdraw;
    _input_withdrawToAddress;
    _input_manualAddress;

    reset() {
        this.setState({
            isBusy: false,
            formValid: false,
            formValidated: false,
            showManualAddress: false,
            signerValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            },
            totalToWithdrawValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            },
            withdrawToAddressValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            },
            manualAddressValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            }
        });
    }

    render() {
        const keys = this.props.keys;

        const validateSigner = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            Utils.validateAddress(value).catch((err) => {
                validationInfo.isValid = false;
                validationInfo.error = err.message;
            }).finally(() => {
                if (!keyHasPerms({address: value} as ProvenanceKey)) {
                    validationInfo.isValid = false;
                    validationInfo.error = `Signer address does not have permissions to withdraw coin on this marker`;
                }

                this.setState({
                    formValid: validationInfo.isValid && this.state.totalToWithdrawValidation.isValid && this.state.withdrawToAddressValidation.isValid,
                    formValidated: validationInfo.isValidated && this.state.totalToWithdrawValidation.isValidated && this.state.withdrawToAddressValidation.isValidated,
                    signerValidation: validationInfo
                });
            });
        }

        const validateTotalToWithdraw = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            if (isNaN(+value)) {
                validationInfo.isValid = false;
                validationInfo.error = `Total coin to withdraw must be numeric`;
            } else if (value.length == 0) {
                validationInfo.isValid = false;
                validationInfo.error = `Total coin to withdraw is required`;
            }

            this.setState({
                formValid: validationInfo.isValid && this.state.signerValidation.isValid && this.state.withdrawToAddressValidation.isValid,
                formValidated: validationInfo.isValidated && this.state.signerValidation.isValidated && this.state.withdrawToAddressValidation.isValidated,
                totalToWithdrawValidation: validationInfo
            });
        }

        const validateWithdrawToAddress = (value) => {
            if (value == "manual") {
                this.setState({
                    showManualAddress: true
                });
            } else {
                var validationInfo: ValidationInfo = {
                    isValid: true,
                    isValidated: true,
                    error: undefined
                };

                Utils.validateAddress(value).catch((err) => {
                    validationInfo.isValid = false;
                    validationInfo.error = err.message;
                }).finally(() => {
                    this.setState({
                        formValid: validationInfo.isValid && this.state.signerValidation.isValid && this.state.totalToWithdrawValidation.isValid,
                        formValidated: validationInfo.isValidated && this.state.signerValidation.isValidated && this.state.totalToWithdrawValidation.isValidated,
                        withdrawToAddressValidation: validationInfo,
                        showManualAddress: false
                    });
                });
            }
        }

        const validateManualAddress = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            Utils.validateAddress(value).catch((err) => {
                validationInfo.isValid = false;
                validationInfo.error = err.message;
            }).finally(() => {
                this.setState({
                    formValid: validationInfo.isValid && this.state.signerValidation.isValid && this.state.totalToWithdrawValidation.isValid,
                    formValidated: validationInfo.isValidated && this.state.signerValidation.isValidated && this.state.totalToWithdrawValidation.isValidated,
                    manualAddressValidation: validationInfo
                });
            });
        };

        const keyHasPerms = (k) => {
            if (this.props.marker) {
                const accessControl = this.props.marker.access_control.find((access) => {
                    return (access.address == k.address);
                });
                return (accessControl != undefined && accessControl.permissions.findIndex((perm) => {
                    return (perm == 'ACCESS_WITHDRAW');
                }) >= 0);
            } else {
                return false;
            }
        }

        const keysWithPerms = (keys) => {
            var foundKeys: ProvenanceKey[] = [];

            keys.forEach((key) => {
                if (keyHasPerms(key)) {
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
                    className="withdrawMarkerModal"
                >
                    <Modal.Header closeButton={!this.state.isBusy}>
                        <Modal.Title id="contained-modal-title-vcenter">Withdraw Marker Coins</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group as={Row} controlId="signer">
                                <Form.Label column sm={3}>Signer</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        custom
                                        as="select"
                                        placeholder=""
                                        ref={(c) => this._input_signer = c}
                                        onChange={e => validateSigner(e.currentTarget.value)}
                                        isInvalid={!this.state.signerValidation.isValid}
                                        disabled={this.state.isBusy}
                                    >
                                        {keysWithPerms(keys).map((key, idx) =>
                                            <option value={key.address}>{key.name} ({key.address})</option>
                                        )}
                                    </Form.Control>
                                    <Form.Control.Feedback type="invalid">{this.state.signerValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="coin">
                                <Form.Label column sm={3}>Total</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        type="number"
                                        placeholder=""
                                        ref={(c) => this._input_totalToWithdraw = c}
                                        onChange={e => validateTotalToWithdraw(e.currentTarget.value)}
                                        isInvalid={!this.state.totalToWithdrawValidation.isValid}
                                        disabled={this.state.isBusy}
                                    />
                                    <Form.Control.Feedback type="invalid">{this.state.totalToWithdrawValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="withdraw-to">
                                <Form.Label column sm={3}>Withdraw to</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        custom
                                        as="select"
                                        placeholder=""
                                        ref={(c) => this._input_withdrawToAddress = c}
                                        onChange={e => validateWithdrawToAddress(e.currentTarget.value)}
                                        isInvalid={!this.state.withdrawToAddressValidation.isValid}
                                        disabled={this.state.isBusy}
                                    >
                                        {keys.map((key, idx) =>
                                            <option value={key.address}>{key.name} ({key.address})</option>
                                        )}
                                        <option value="manual">Other address...</option>
                                    </Form.Control>
                                    <Form.Control.Feedback type="invalid">{this.state.withdrawToAddressValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                            {this.state.showManualAddress && <Form.Group as={Row} controlId="manualAddress">
                                <Form.Label column sm={3}>Withdraw Address</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        type="text"
                                        placeholder=""
                                        ref={(c) => this._input_manualAddress = c}
                                        onChange={e => validateManualAddress(e.currentTarget.value)}
                                        isInvalid={!this.state.manualAddressValidation.isValid}
                                        disabled={this.state.isBusy}
                                    />
                                    <Form.Control.Feedback type="invalid">{this.state.manualAddressValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>}
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button 
                            variant="primary" 
                            onClick={this.withdrawMarker} 
                            disabled={this.state.isBusy || (!this.state.formValidated || !this.state.formValid)}
                        >
                            { this.state.isBusy ? <span><Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                /> Withdrawing Coins...</span>
                            : <span>Withdraw Coins</span>}
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

    private withdrawMarker() {
        this.setState({ isBusy: true });

        const signer = this._input_signer.value as string;
        const totalToWithdraw = Number(this._input_totalToWithdraw.value as string);
        const withdrawTo = this.state.showManualAddress ? this._input_manualAddress.value as string : this._input_withdrawToAddress.value as string;

        Utils.withdrawCoin(this.props.marker.denom, totalToWithdraw, withdrawTo, signer).then(() => {
            this.setState({ isBusy: false });
            this.props.onMarkerWithdrawn(this.props.marker, totalToWithdraw, withdrawTo);
        }).catch((err) => {
            this.setState({ isBusy: false });
            this.props.onError(err);
        });
    }

}

import * as React from "react";
import './add-marker-modal.scss';

import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { ProvenanceKey } from './provenance-key';
import { ProvenanceMarker, ProvenanceMarkerAccessControl } from './provenance-marker';
import { Utils } from './app-utils';

interface ValidationInfo {
    isValid: boolean,
    isValidated: boolean,
    error: (string | undefined)
}

interface MarkerManagerPrivileges {
    admin: boolean,
    burn: boolean,
    deposit: boolean,
    delete: boolean,
    mint: boolean,
    transfer: boolean,
    withdraw: boolean
}

interface AddMarkerModalProps {
    show: boolean,
    keys: ProvenanceKey[],
    onCancel: (() => void),
    onMarkerCreated: ((key: ProvenanceMarker) => void)
    onError: ((err: Error) => void)
}

interface AddMarkerModalState {
    isBusy: boolean,
    formValid: boolean,
    formValidated: boolean,
    privs: MarkerManagerPrivileges,
    markerDenomValidation: ValidationInfo,
    markerSupplyValidation: ValidationInfo,
    markerTypeValidation: ValidationInfo,
    markerManagerValidation: ValidationInfo
}

export default class AddMarkerModal extends React.Component<AddMarkerModalProps, AddMarkerModalState> {

    constructor(props: any) {
        super(props);

        this.state = {
            isBusy: false,
            formValid: false,
            formValidated: false,
            privs: {
                admin: true,
                burn: true,
                deposit: true,
                delete: true,
                mint: true,
                transfer: true,
                withdraw: true
            },
            markerDenomValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            },
            markerSupplyValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            },
            markerTypeValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            },
            markerManagerValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            }
        };

        this.createMarker = this.createMarker.bind(this);
    }

    _input_markerDenom;
    _input_markerSupply;
    _input_markerType;
    _input_markerManager;

    reset() {
        this.setState({
            isBusy: false,
            formValid: false,
            formValidated: false,
            privs: {
                admin: true,
                burn: true,
                deposit: true,
                delete: true,
                mint: true,
                transfer: true,
                withdraw: true
            },
            markerDenomValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            },
            markerSupplyValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            },
            markerTypeValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            },
            markerManagerValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            }
        });
    }

    render() {
        const keys = this.props.keys;

        const validateMarkerDenom = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            if (value.includes(' ')) {
                validationInfo.isValid = false;
                validationInfo.error = "Marker denom cannot include spaces";
            } else if (value.length == 0) {
                validationInfo.isValid = false;
                validationInfo.error = "Marker denom required";
            }

            this.setState({
                formValid: validationInfo.isValid && this.state.markerSupplyValidation.isValid && this.state.markerTypeValidation.isValid && this.state.markerManagerValidation.isValid,
                formValidated: validationInfo.isValidated && this.state.markerSupplyValidation.isValidated && this.state.markerTypeValidation.isValidated && this.state.markerManagerValidation.isValidated,
                markerDenomValidation: validationInfo
            });
        }

        const validateMarkerSupply = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            if (isNaN(+value)) {
                validationInfo.isValid = false;
                validationInfo.error = "Marker supply must be numeric";
            } else if (value.length == 0) {
                validationInfo.isValid = false;
                validationInfo.error = "Marker denom required";
            }

            this.setState({
                formValid: validationInfo.isValid && this.state.markerDenomValidation.isValid && this.state.markerTypeValidation.isValid && this.state.markerManagerValidation.isValid,
                formValidated: validationInfo.isValidated && this.state.markerDenomValidation.isValidated && this.state.markerTypeValidation.isValidated && this.state.markerManagerValidation.isValidated,
                markerSupplyValidation: validationInfo
            });
        }

        const validateMarkerType = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            if (['coin', 'restricted'].indexOf(value) < 0) {
                validationInfo.isValid = false;
                validationInfo.error = "Marker type must be one of: 'coin', 'restricted'";
            }

            this.setState({
                formValid: validationInfo.isValid && this.state.markerDenomValidation.isValid && this.state.markerSupplyValidation.isValid && this.state.markerManagerValidation.isValid,
                formValidated: validationInfo.isValidated && this.state.markerDenomValidation.isValidated && this.state.markerSupplyValidation.isValidated && this.state.markerManagerValidation.isValidated,
                markerSupplyValidation: validationInfo
            });
        }

        const validateMarkerManager = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            if (!value.startsWith('tp') && !value.startsWith('pb')) {
                validationInfo.isValid = false;
                validationInfo.error = "Marker manager address looks invalid";
            } else if (value.length != 41) {
                validationInfo.isValid = false;
                validationInfo.error = "Marker manager address looks invalid";
            }

            this.setState({
                formValid: validationInfo.isValid && this.state.markerDenomValidation.isValid && this.state.markerSupplyValidation.isValid && this.state.markerTypeValidation.isValid,
                formValidated: validationInfo.isValidated && this.state.markerDenomValidation.isValidated && this.state.markerSupplyValidation.isValidated && this.state.markerTypeValidation.isValidated,
                markerSupplyValidation: validationInfo
            });
        }

        const updatePrivileges = (priv, checked) => {
            var privs = this.state.privs;

            switch(priv) {
                case 'admin': privs.admin = checked; break;
                case 'burn': privs.burn = checked; break;
                case 'deposit': privs.deposit = checked; break;
                case 'delete': privs.delete = checked; break;
                case 'mint': privs.mint = checked; break;
                case 'transfer': privs.transfer = checked; break;
                case 'withdraw': privs.withdraw = checked; break;
            }

            this.setState({
                privs: privs
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
                    className="addMarkerModal"
                >
                    <Modal.Header closeButton={!this.state.isBusy}>
                        <Modal.Title id="contained-modal-title-vcenter">Create New Marker</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group as={Row} controlId="denom">
                                <Form.Label column sm={3}>Marker denom</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        type="text"
                                        placeholder=""
                                        ref={(c) => this._input_markerDenom = c}
                                        onChange={e => validateMarkerDenom(e.currentTarget.value)}
                                        isInvalid={!this.state.markerDenomValidation.isValid}
                                        disabled={this.state.isBusy}
                                    />
                                    <Form.Control.Feedback type="invalid">{this.state.markerDenomValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="supply">
                                <Form.Label column sm={3}>Supply</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        type="number"
                                        placeholder=""
                                        ref={(c) => this._input_markerSupply = c}
                                        onChange={e => validateMarkerSupply(e.currentTarget.value)}
                                        isInvalid={!this.state.markerSupplyValidation.isValid}
                                        disabled={this.state.isBusy}
                                    />
                                    <Form.Control.Feedback type="invalid">{this.state.markerSupplyValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="type">
                                <Form.Label column sm={3}>Marker type</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        custom
                                        as="select"
                                        placeholder=""
                                        ref={(c) => this._input_markerType = c}
                                        onChange={e => validateMarkerType(e.currentTarget.value)}
                                        isInvalid={!this.state.markerTypeValidation.isValid}
                                        disabled={this.state.isBusy}
                                    >
                                        <option value="coin">MARKER_TYPE_COIN</option>
                                        <option value="restricted">MARKER_TYPE_RESTRICTED</option>
                                    </Form.Control>
                                    <Form.Control.Feedback type="invalid">{this.state.markerTypeValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="manager">
                                <Form.Label column sm={3}>Manager</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        custom
                                        as="select"
                                        placeholder=""
                                        ref={(c) => this._input_markerManager = c}
                                        onChange={e => validateMarkerManager(e.currentTarget.value)}
                                        isInvalid={!this.state.markerManagerValidation.isValid}
                                        disabled={this.state.isBusy}
                                    >
                                        {keys.map((key, idx) =>
                                            <option value={key.address}>{key.name} ({key.address})</option>
                                        )}
                                    </Form.Control>
                                    <Form.Control.Feedback type="invalid">{this.state.markerManagerValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="privs">
                                <Form.Label column sm={3}>Privileges</Form.Label>
                                <Col sm={9}>
                                    <Form.Check type="checkbox" id="admin" label="ACCESS_ADMIN" checked={this.state.privs.admin} disabled={this.state.isBusy} onChange={e => updatePrivileges('admin', e.target.checked)} />
                                    <Form.Check type="checkbox" id="burn" label="ACCESS_BURN" checked={this.state.privs.burn} disabled={this.state.isBusy} onChange={e => updatePrivileges('burn', e.target.checked)} />
                                    <Form.Check type="checkbox" id="delete" label="ACCESS_DELETE" checked={this.state.privs.delete} disabled={this.state.isBusy} onChange={e => updatePrivileges('delete', e.target.checked)} />
                                    <Form.Check type="checkbox" id="deposit" label="ACCESS_DEPOSIT" checked={this.state.privs.deposit} disabled={this.state.isBusy} onChange={e => updatePrivileges('deposit', e.target.checked)} />
                                    <Form.Check type="checkbox" id="mint" label="ACCESS_MINT" checked={this.state.privs.mint} disabled={this.state.isBusy} onChange={e => updatePrivileges('mint', e.target.checked)} />
                                    <Form.Check type="checkbox" id="transfer" label="ACCESS_TRANSFER" checked={this.state.privs.transfer} disabled={this.state.isBusy} onChange={e => updatePrivileges('transfer', e.target.checked)} />
                                    <Form.Check type="checkbox" id="withdraw" label="ACCESS_WITHDRAW" checked={this.state.privs.withdraw} disabled={this.state.isBusy} onChange={e => updatePrivileges('withdraw', e.target.checked)} />
                                </Col>
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button 
                            variant="primary" 
                            onClick={this.createMarker} 
                            disabled={this.state.isBusy || (!this.state.formValidated || !this.state.formValid)}
                        >
                            { this.state.isBusy ? <span><Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                /> Creating Marker...</span>
                            : <span>Create Marker</span>}
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

    private privsToPerms(privs: MarkerManagerPrivileges): string[] {
        var perms: string[] = [];

        if (privs.admin) perms.push('ACCESS_ADMIN');
        if (privs.burn) perms.push('ACCESS_BURN');
        if (privs.delete) perms.push('ACCESS_DELETE');
        if (privs.deposit) perms.push('ACCESS_DEPOSIT');
        if (privs.mint) perms.push('ACCESS_MINT');
        if (privs.transfer) perms.push('ACCESS_TRANSFER');
        if (privs.withdraw) perms.push('ACCESS_WITHDRAW');

        return perms;
    }

    private createMarker() {
        this.setState({ isBusy: true });

        const markerDenom = this._input_markerDenom.value as string;
        const markerSupply = Number(this._input_markerSupply.value as string);
        const markerType = this._input_markerType.value as string;
        const markerManager = this._input_markerManager.value as string;

        var markerAccess: ProvenanceMarkerAccessControl[] = [];
        markerAccess.push({
            address: markerManager,
            permissions: this.privsToPerms(this.state.privs)
        });

        Utils.createMarker(markerDenom, markerSupply, markerType, markerManager, markerAccess).then((marker: (ProvenanceMarker | undefined)) => {
            this.setState({ isBusy: false });
            if (marker) {
                this.props.onMarkerCreated(marker);
            } else {
                this.props.onError(new Error(`Unknown error creating marker ${markerDenom}`));
            }
        }).catch((err) => {
            this.setState({ isBusy: false });
            this.props.onError(err);
        });
    }
}

import * as React from "react";
import './add-marker-access-modal.scss';

import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { ProvenanceKey } from './provenance-key';
import { Alert } from './app-binding';
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

interface AddMarkerAccessModalProps {
    show: boolean,
    marker: ProvenanceMarker,
    keys: ProvenanceKey[],
    onCancel: (() => void),
    onAccessAdded: ((marker: ProvenanceMarker, access: ProvenanceMarkerAccessControl) => void)
    onError: ((err: Error) => void)
}

interface AddMarkerAccessModalState {
    isBusy: boolean,
    formValid: boolean,
    formValidated: boolean,
    privs: MarkerManagerPrivileges,
    accessAddressValidation: ValidationInfo
}

export default class AddMarkerAccessModal extends React.Component<AddMarkerAccessModalProps, AddMarkerAccessModalState> {

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
            accessAddressValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            }
        };

        this.addAccess = this.addAccess.bind(this);
    }

    _input_accessAddress;

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
            accessAddressValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            }
        });
    }

    render() {
        const keys = this.props.keys;

        const validateAccessAddress = (value) => {
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
                formValid: validationInfo.isValid,
                formValidated: validationInfo.isValidated,
                accessAddressValidation: validationInfo
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
                    className="addMarkerAccessModal"
                >
                    <Modal.Header closeButton={!this.state.isBusy}>
                        <Modal.Title id="contained-modal-title-vcenter">Add Marker Access</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group as={Row} controlId="address">
                                <Form.Label column sm={3}>Address</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        custom
                                        as="select"
                                        placeholder=""
                                        ref={(c) => this._input_accessAddress = c}
                                        onChange={e => validateAccessAddress(e.currentTarget.value)}
                                        isInvalid={!this.state.accessAddressValidation.isValid}
                                        disabled={this.state.isBusy}
                                    >
                                        {keys.map((key, idx) =>
                                            <option value={key.address}>{key.name} ({key.address})</option>
                                        )}
                                    </Form.Control>
                                    <Form.Control.Feedback type="invalid">{this.state.accessAddressValidation.error}</Form.Control.Feedback>
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
                            onClick={this.addAccess} 
                            disabled={this.state.isBusy || (!this.state.formValidated || !this.state.formValid)}
                        >
                            { this.state.isBusy ? <span><Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                /> Adding Access...</span>
                            : <span>Add Access</span>}
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

    private addAccess() {
        this.setState({ isBusy: true });

        const accessAddress = this._input_accessAddress.value as string;

        var markerAccess: ProvenanceMarkerAccessControl[] = [];
        markerAccess.push({
            address: accessAddress,
            permissions: this.privsToPerms(this.state.privs)
        });

        // find account with admin permissions
        const admin = this.props.marker.access_control.find((access) => {
            return access.permissions.find((perm) => {
                return perm == 'ACCESS_ADMIN';
            }) != undefined;
        });

        if(admin != undefined) {
            Utils.grantMarkerPrivs(this.props.marker.denom, markerAccess, admin.address).then((marker: (ProvenanceMarker | undefined)) => {
                this.setState({ isBusy: false });
                if (marker) {
                    this.props.onAccessAdded(marker, markerAccess[0]);
                } else {
                    this.props.onError(new Error(`Unknown error granting privleges for ${accessAddress} on marker ${this.props.marker.denom}`));
                }
            }).catch((err) => {
                this.setState({ isBusy: false });
                this.props.onError(err);
            });
        } else {
            this.setState({ isBusy: false });
            Utils.showAlert(Alert.Danger, `Unable to grant privileges on marker`, `Failed to locate an account with ACCESS_ADMIN privileges to grant privileges on marker "${this.props.marker.denom}".`, true);
        }
    }

}

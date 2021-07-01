import * as React from "react";
import './mint-or-burn-marker-modal.scss';

import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { ProvenanceKey } from './provenance-key';
import { ProvenanceMarker } from './provenance-marker';
import { Utils } from './app-utils';

export enum MintOrBurnMode {
    Mint = 'mint',
    Burn = 'burn'
}

interface ValidationInfo {
    isValid: boolean,
    isValidated: boolean,
    error: (string | undefined)
}

interface MintOrBurnMarkerModalProps {
    show: boolean,
    keys: ProvenanceKey[],
    marker: ProvenanceMarker,
    mode: MintOrBurnMode,
    onCancel: (() => void),
    onMarkerMinted: ((marker: ProvenanceMarker, total: number) => void),
    onMarkerBurned: ((marker: ProvenanceMarker, total: number) => void),
    onError: ((err: Error) => void)
}

interface MintOrBurnMarkerModalState {
    isBusy: boolean,
    formValid: boolean,
    formValidated: boolean,
    minterOrBurnerValidation: ValidationInfo,
    totalToMintOrBurnValidation: ValidationInfo
}

export class MintOrBurnMarkerModal extends React.Component<MintOrBurnMarkerModalProps, MintOrBurnMarkerModalState> {

    constructor(props: any) {
        super(props);

        this.state = {
            isBusy: false,
            formValid: false,
            formValidated: false,
            minterOrBurnerValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            },
            totalToMintOrBurnValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            }
        };

        this.mintOrBurnMarker = this.mintOrBurnMarker.bind(this);
    }

    _input_minterOrBurner;
    _input_totalToMintOrBurn;

    reset() {
        this.setState({
            isBusy: false,
            formValid: false,
            formValidated: false,
            minterOrBurnerValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            },
            totalToMintOrBurnValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            }
        });
    }

    render() {
        const keys = this.props.keys;

        const validateMinterOrBurner = (value) => {
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
            } else if (!keyHasPerms({address: value} as ProvenanceKey)) {
                validationInfo.isValid = false;
                if (this.props.mode == MintOrBurnMode.Mint) {
                    validationInfo.error = "Minter address does not have permissions to mint coin on this marker";
                } else {
                    validationInfo.error = "Burner address does not have permissions to burn coin on this marker";
                }
            }

            this.setState({
                formValid: validationInfo.isValid && this.state.totalToMintOrBurnValidation.isValid,
                formValidated: validationInfo.isValidated && this.state.totalToMintOrBurnValidation.isValidated,
                minterOrBurnerValidation: validationInfo
            });
        }

        const validateTotalToMintOrBurn = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            if (isNaN(+value)) {
                validationInfo.isValid = false;
                validationInfo.error = `Total coin to ${this.props.mode == MintOrBurnMode.Mint ? "mint" : "burn"} must be numeric`;
            } else if (value.length == 0) {
                validationInfo.isValid = false;
                validationInfo.error = `Total coin to ${this.props.mode == MintOrBurnMode.Mint ? "mint" : "burn"} is required`;
            }

            this.setState({
                formValid: validationInfo.isValid && this.state.minterOrBurnerValidation.isValid,
                formValidated: validationInfo.isValidated && this.state.minterOrBurnerValidation.isValidated,
                totalToMintOrBurnValidation: validationInfo
            });
        }

        const keyHasPerms = (k) => {
            if (this.props.marker) {
                const accessControl = this.props.marker.access_control.find((access) => {
                    return (access.address == k.address);
                });
                return (accessControl != undefined && accessControl.permissions.findIndex((perm) => {
                    return ((this.props.mode == MintOrBurnMode.Mint && perm == 'ACCESS_MINT') || (this.props.mode == MintOrBurnMode.Burn && perm == 'ACCESS_BURN'));
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
                    className="mintOrBurnMarkerModal"
                >
                    <Modal.Header closeButton={!this.state.isBusy}>
                        <Modal.Title id="contained-modal-title-vcenter">{this.props.mode == MintOrBurnMode.Mint ? "Mint Marker Coins" : "Burn Marker Coins"}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group as={Row} controlId="minter-or-burner">
                                <Form.Label column sm={3}>{this.props.mode == MintOrBurnMode.Mint ? "Minter" : "Burner"}</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        custom
                                        as="select"
                                        placeholder=""
                                        ref={(c) => this._input_minterOrBurner = c}
                                        onChange={e => validateMinterOrBurner(e.currentTarget.value)}
                                        isInvalid={!this.state.minterOrBurnerValidation.isValid}
                                        disabled={this.state.isBusy}
                                    >
                                        {keysWithPerms(keys).map((key, idx) =>
                                            <option value={key.address}>{key.name} ({key.address})</option>
                                        )}
                                    </Form.Control>
                                    <Form.Control.Feedback type="invalid">{this.state.minterOrBurnerValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="coin">
                                <Form.Label column sm={3}>Total</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        type="number"
                                        placeholder=""
                                        ref={(c) => this._input_totalToMintOrBurn = c}
                                        onChange={e => validateTotalToMintOrBurn(e.currentTarget.value)}
                                        isInvalid={!this.state.totalToMintOrBurnValidation.isValid}
                                        disabled={this.state.isBusy}
                                    />
                                    <Form.Control.Feedback type="invalid">{this.state.totalToMintOrBurnValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button 
                            variant="primary" 
                            onClick={this.mintOrBurnMarker} 
                            disabled={this.state.isBusy || (!this.state.formValidated || !this.state.formValid)}
                        >
                            { this.state.isBusy ? <span><Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                /> {this.props.mode == MintOrBurnMode.Mint ? "Minting Coins" : "Burning Coins"}...</span>
                            : <span>{this.props.mode == MintOrBurnMode.Mint ? "Mint Coins" : "Burn Coins"}</span>}
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

    private mintOrBurnMarker() {
        this.setState({ isBusy: true });

        const minterOrBurner = this._input_minterOrBurner.value as string;
        const totalToMintOrBurn = Number(this._input_totalToMintOrBurn.value as string);

        if (this.props.mode == MintOrBurnMode.Mint) {
            Utils.mintCoin(this.props.marker.denom, totalToMintOrBurn, minterOrBurner).then(() => {
                this.setState({ isBusy: false });
                this.props.onMarkerMinted(this.props.marker, totalToMintOrBurn);
            }).catch((err) => {
                this.setState({ isBusy: false });
                this.props.onError(err);
            });
        } else {
            Utils.burnCoin(this.props.marker.denom, totalToMintOrBurn, minterOrBurner).then(() => {
                this.setState({ isBusy: false });
                this.props.onMarkerBurned(this.props.marker, totalToMintOrBurn);
            }).catch((err) => {
                this.setState({ isBusy: false });
                this.props.onError(err);
            });
        }
    }

}

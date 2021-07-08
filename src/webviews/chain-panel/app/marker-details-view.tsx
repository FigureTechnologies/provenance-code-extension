import * as React from "react";
import './marker-details-view.scss';
import { FaMinusSquare, FaPlus } from 'react-icons/fa';
import { Button, Card, Col, Container, OverlayTrigger, Row, Table, Tooltip } from 'react-bootstrap';
import Dialog from 'react-bootstrap-dialog';

import { Alert } from './app-binding';
import { ProvenanceAccountBalance } from "./provenance-account-balance";
import { ProvenanceKey } from './provenance-key';
import { ProvenanceMarker } from './provenance-marker';
import { Utils } from './app-utils';

import AddMarkerAccessModal from './add-marker-access-modal';

interface MarkerDetailsViewProps {
    accountKeys: ProvenanceKey[],
    marker: ProvenanceMarker,
    balances: ProvenanceAccountBalance[]
}

interface MarkerDetailsViewState {
    addMarkerAccessModalShown: boolean,
    marker: ProvenanceMarker
}

export default class MarkerDetailsView extends React.Component<MarkerDetailsViewProps, MarkerDetailsViewState> {

    constructor(props: any) {
        super(props);

        this.state = {
            addMarkerAccessModalShown: false,
            marker: this.props.marker
        }
    }

    confirmRevokeAccessDialog: Dialog;

    render() {
        const marker = this.state.marker;
        const keys = this.props.accountKeys;
        const balances = this.props.balances;

        const revokeAccess = (a) => {
            this.confirmRevokeAccessDialog.show({
                title: 'Confirm revoke access',
                body: `Are you sure you want to revoke access for "${a}" on the marker "${marker.denom}"?`,
                bsSize: 'small',
                actions: [
                    Dialog.OKAction(() => {
                        // find account with admin permissions
                        const admin = marker.access_control.find((access) => {
                            return access.permissions.find((perm) => {
                                return perm == 'ACCESS_ADMIN';
                            }) != undefined;
                        });

                        if(admin != undefined) {
                            Utils.revokeMarkerPrivs(marker.denom, a, admin.address).then((marker) => {
                                this.setState({
                                    marker: marker
                                });
                                Utils.showAlert(Alert.Success, `Revoked privileges on marker "${marker.denom}"`, `Revoked privileges for ${a} on marker ${marker.denom}`, true);
                            }).catch((err) => {
                                Utils.showAlert(Alert.Danger, `Unable to revoke access for marker "${marker.denom}"`, err.message, true);
                            });
                        } else {
                            Utils.showAlert(Alert.Danger, `Unable to revoke privileges on marker`, `Failed to locate an account with ACCESS_ADMIN privileges to revoke privileges on marker "${marker.denom}".`, true);
                        }
                    }),
                    Dialog.CancelAction()
                ]
            });
        };

        const showAddMarkerAccessModal = () => {
            this.setState({
                addMarkerAccessModalShown: true
            });
        };

        const hideAddMarkerAccessModal = () => {
            this.setState({
                addMarkerAccessModalShown: false
            });
        };

        const renderAddMarkerAccessTooltip = (props) => (
            <Tooltip id="add-button-tooltip" {...props}>Add access</Tooltip>
        );

        const renderRevokeAccessTooltip = (props) => (
            <Tooltip id="revoke-button-tooltip" {...props}>Revoke access</Tooltip>
        );

        return (
            <React.Fragment>
                <Card className="detailsCard">
                    <Card.Header>Marker Details</Card.Header>
                    <Card.Body>
                        <Container>
                            <Row>
                                <Col sm={3}>Marker Denom:</Col>
                                <Col sm={9} className="markerDetailsField">{marker.denom}</Col>
                            </Row>
                            <Row>
                                <Col sm={3}>Base Account:</Col>
                                <Col sm={9} className="markerDetailsField">{marker.base_account.address}</Col>
                            </Row>
                            <Row>
                                <Col sm={3}>Status:</Col>
                                <Col sm={9} className="markerDetailsField">{marker.status}</Col>
                            </Row>
                            <Row>
                                <Col sm={3}>Supply:</Col>
                                <Col sm={9} className="markerDetailsField">{marker.supply} {marker.supply_fixed && <span>(fixed)</span>}</Col>
                            </Row>
                            <Row>
                                <Col sm={3}>Type:</Col>
                                <Col sm={9} className="markerDetailsField">{marker.marker_type}</Col>
                            </Row>
                        </Container>
                    </Card.Body>
                </Card>
                <br />
                <Card className="detailsCard">
                    <Card.Header>Marker Balances</Card.Header>
                    <Card.Body>
                        { (balances.length == 0) && <div className="noAssetsMarkers">No Assets/Markers</div> }
                        { (balances.length > 0) && <Table striped bordered hover responsive variant="dark" size="sm">
                            <thead>
                                <tr>
                                    <th>Denom</th>
                                    <th>Balance</th>
                                </tr>
                            </thead>
                            <tbody className="markerDetailsField noselect">
                                {balances.map((balance, idx) =>
                                    <tr>
                                        <td>{balance.denom}</td>
                                        <td>{balance.amount}</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>}
                    </Card.Body>
                </Card>
                <br />
                <Card className="detailsCard">
                    <Card.Header>
                        Access Control
                        <OverlayTrigger
                                placement="bottom"
                                delay={{ show: 250, hide: 400 }}
                                overlay={renderAddMarkerAccessTooltip}
                        >
                            <Button 
                                variant="primary" 
                                size="sm" 
                                className="float-right mr-1" 
                                onClick={() => showAddMarkerAccessModal()}
                            >
                                    <FaPlus />
                            </Button>
                        </OverlayTrigger>
                    </Card.Header>
                    <Card.Body>
                        {marker.access_control.map((access, idx) => 
                            <div>
                                {idx > 0 && <div className="markerAccessSep"></div>}
                                <Container>
                                    <Row>
                                        <Col sm={3}>Address:</Col>
                                        <Col sm={8} className="markerDetailsField">
                                            {access.address} ({Utils.getKeyForAddress(keys, access.address) != undefined ? Utils.getKeyForAddress(keys, access.address).name : "unknown"})
                                        </Col>
                                        <Col sm={1} className="text-right">
                                        <OverlayTrigger
                                                    placement="bottom"
                                                    delay={{ show: 250, hide: 400 }}
                                                    overlay={renderRevokeAccessTooltip}
                                            >
                                                <span className="accessControlAction"><a href="#" className="actions" onClick={() => revokeAccess(access.address)}><FaMinusSquare /></a></span>
                                            </OverlayTrigger>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col sm={3}>Permissions:</Col>
                                        <Col sm={8} className="markerDetailsField">{access.permissions.map((perm, idx) => 
                                            <div>{perm}</div>
                                        )}</Col>
                                        <Col sm={1}></Col>
                                    </Row>
                                </Container>
                            </div>
                        )}
                    </Card.Body>
                </Card>
                <AddMarkerAccessModal
                    show={this.state.addMarkerAccessModalShown}
                    marker={marker}
                    keys={keys}
                    onCancel={() => hideAddMarkerAccessModal() }
                    onAccessAdded={(marker, access) => { 
                        hideAddMarkerAccessModal();
                        this.setState({
                            marker: marker
                        });
                        Utils.showAlert(Alert.Success, `Granted privileges on marker "${marker.denom}"`, `Granted privileges for ${access.address} on marker ${marker.denom}`, true);
                    }}
                    onError={(err) => {
                        Utils.showAlert(Alert.Danger, `Unable to grant privileges on marker "${marker.denom}"`, err.message, true);
                    }}
                ></AddMarkerAccessModal>
                <Dialog ref={(el) => { this.confirmRevokeAccessDialog = el }} />
            </React.Fragment>
        );
    }
}

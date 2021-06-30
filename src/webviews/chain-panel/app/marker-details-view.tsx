import * as React from "react";
import './marker-details-view.scss';
import { FaPlus } from 'react-icons/fa';
import { Button, Card, Col, Container, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';
import { Alert } from './app-binding';
import { ProvenanceKey } from './provenance-key';
import { ProvenanceMarker } from './provenance-marker';
import { Utils } from './app-utils';

import AddMarkerAccessModal from './add-marker-access-modal';

interface MarkerDetailsViewProps {
    accountKeys: ProvenanceKey[],
    marker: ProvenanceMarker
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

    render() {
        const marker = this.state.marker;
        const keys = this.props.accountKeys;

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
            <Tooltip id="button-tooltip" {...props}>Add access</Tooltip>
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
                                        <Col sm={9} className="markerDetailsField">{access.address} ({Utils.getKeyForAddress(keys, access.address) != undefined ? Utils.getKeyForAddress(keys, access.address).name : "unknown"})</Col>
                                    </Row>
                                    <Row>
                                        <Col sm={3}>Permissions:</Col>
                                        <Col sm={9} className="markerDetailsField">{access.permissions.map((perm, idx) => 
                                            <div>{perm}</div>
                                        )}</Col>
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
            </React.Fragment>
        );
    }
}

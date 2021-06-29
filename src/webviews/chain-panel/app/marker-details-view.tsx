import * as React from "react";
import './marker-details-view.scss';

import { Card, Col, Container, Row } from 'react-bootstrap';
import { ProvenanceMarker } from './provenance-marker';

interface MarkerDetailsViewProps {
    marker: ProvenanceMarker
}

export default class MarkerDetailsView extends React.Component<MarkerDetailsViewProps> {

    constructor(props: any) {
        super(props);

        this.state = {
            marker: undefined
        }
    }

    render() {
        const marker = this.props.marker;

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
                    <Card.Header>Access Control</Card.Header>
                    <Card.Body>
                        {marker.access_control.map((access, idx) => 
                            <Container>
                                <Row>
                                    <Col sm={3}>Address:</Col>
                                    <Col sm={9} className="markerDetailsField">{access.address}</Col>
                                </Row>
                                <Row>
                                    <Col sm={3}>Permissions:</Col>
                                    <Col sm={9} className="markerDetailsField">{access.permissions.map((perm, idx) => 
                                        <div>{perm}</div>
                                    )}</Col>
                                </Row>
                            </Container>
                        )}
                    </Card.Body>
                </Card>
            </React.Fragment>
        );
    }
}

import * as React from "react";
import './add-marker-modal.scss';

import { Button, Col, Form, Modal, Row } from 'react-bootstrap';

interface AddMarkerModalProps {
    show: boolean,
    onCancel: (() => void)
}

export default class AddMarkerModal extends React.Component<AddMarkerModalProps> {

    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <React.Fragment>
                <Modal
                    {...this.props}
                    size="lg"
                    aria-labelledby="contained-modal-title-vcenter"
                    centered
                    onHide={() => this.props.onCancel()}
                    className="addMarkerModal"
                >
                    <Modal.Header closeButton>
                        <Modal.Title id="contained-modal-title-vcenter">Create New Marker</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group as={Row} controlId="denom">
                                <Form.Label column sm={3}>Marker denom</Form.Label>
                                <Col sm={9}>
                                    <Form.Control type="text" placeholder="" />
                                </Col>
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="primary">Create Marker</Button>
                        <Button variant="secondary" onClick={() => this.props.onCancel() }>Cancel</Button>
                    </Modal.Footer>
                </Modal>
            </React.Fragment>
        );
    }
}

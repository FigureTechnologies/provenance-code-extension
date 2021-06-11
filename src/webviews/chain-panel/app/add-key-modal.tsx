import * as React from "react";
import './add-key-modal.scss';

import { Button, Col, Form, Modal, Row } from 'react-bootstrap';

interface AddKeyModalProps {
    show: boolean,
    onCancel: (() => void)
}

/*

                                    <InputGroup className="mb-3">
                                        <Form.Control type="text" placeholder="" ref={(c) => this._input = c} />
                                        <InputGroup.Append>
                                            <Button variant="outline-secondary" onClick={this.generateRandom}>Random</Button>
                                        </InputGroup.Append>
                                    </InputGroup>

                                    <Form.Control type="text" placeholder="" ref={(c) => this._input = c} />
*/

export default class AddKeyModal extends React.Component<AddKeyModalProps> {

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
                    className="addKeyModal"
                >
                    <Modal.Header closeButton>
                        <Modal.Title id="contained-modal-title-vcenter">Create New Key</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group as={Row} controlId="name">
                                <Form.Label column sm={3}>Key name</Form.Label>
                                <Col sm={9}>
                                    <Form.Control type="text" placeholder="" />
                                </Col>
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="primary">Create Key</Button>
                        <Button variant="secondary" onClick={() => this.props.onCancel() }>Cancel</Button>
                    </Modal.Footer>
                </Modal>
            </React.Fragment>
        );
    }
}

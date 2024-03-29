import * as React from "react";
import { Form, Col, Row, InputGroup } from 'react-bootstrap';
import { SmartContractFunctionProperty } from './smart-contract-function';
import { ISmartContractPropertyView } from './smart-contract-property-view';

import './smart-contract-array-property-view.scss';

interface SmartContractArrayPropertyViewProps {
    property: SmartContractFunctionProperty,
    index: number,
    value: any,
    onChange(value: any): void
}

interface SmartContractArrayPropertyViewState {
    value: number;
}

export default class SmartContractArrayPropertyView extends React.Component<SmartContractArrayPropertyViewProps, SmartContractArrayPropertyViewState> implements ISmartContractPropertyView {

    constructor(props: any) {
        super(props);

        this.state = {
            value: this.props.value
        };
    }

    _inputs;

    render() {
        const prop = this.props.property;
        //const idx = this.props.index;

        return (
            <React.Fragment>
                <Form.Group as={Row} controlId={prop.name}>
                    <Form.Label column sm={2}>{prop.name}</Form.Label>
                    <Col sm={10}>
                        <InputGroup className="mb-3">
                        </InputGroup>
                    </Col>
                </Form.Group>
            </React.Fragment>
        );
    }

    isValid(): boolean {
        // TODO
        return true;
    }

    toJSON(): any {
        // TODO
        return [];
    }

    get value(): any {
        return this.state.value;
    }

    set value(val: any) {
        this.setState({ value: val });
    }

}

/*
                <Form.Group as={Row} controlId={prop.name}>
                    <Form.Label column sm={2}>{prop.name}</Form.Label>
                    <Col sm={10}>
                        <InputGroup className="mb-3">
                            <Form.Control type="text" placeholder="" ref={(c) => this._input = c} />
                            <InputGroup.Append>
                                <Button variant="outline-secondary" onClick={this.generateUuid}>UUID</Button>
                            </InputGroup.Append>
                        </InputGroup>
                    </Col>
                </Form.Group>
*/
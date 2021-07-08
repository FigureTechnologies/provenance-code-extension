import * as React from "react";
import { v4 as uuidv4 } from 'uuid';
import { Form, Col, Row, InputGroup, Button } from 'react-bootstrap';
import { SmartContractFunctionProperty } from './smart-contract-function';
import { ISmartContractPropertyView } from './smart-contract-property-view';

import './smart-contract-string-property-view.scss';

interface SmartContractStringPropertyViewProps {
    property: SmartContractFunctionProperty,
    index: number,
    value: any,
    onChange(value: any): void
}

interface SmartContractStringPropertyViewState {
    value: string;
}

export default class SmartContractStringPropertyView extends React.Component<SmartContractStringPropertyViewProps, SmartContractStringPropertyViewState> implements ISmartContractPropertyView {

    constructor(props: any) {
        super(props);

        this.state = {
            value: this.props.value
        };

        this.generateUuid = this.generateUuid.bind(this);
    }

    _input;

    render() {
        const prop = this.props.property;
        //const idx = this.props.index;

        const onChange = (val) => {
            this.setState({ value: val });
            this.props.onChange(val);
        }

        return (
            <React.Fragment>
                <Form.Group as={Row} controlId={prop.name}>
                    <Form.Label column sm={3}>{prop.name}</Form.Label>
                    <Col sm={9}>
                        <InputGroup className="mb-3">
                            <Form.Control type="text" placeholder="" value={this.state.value} onChange={(e) => onChange(e.currentTarget.value)} ref={(c) => this._input = c} />
                            <InputGroup.Append>
                                <Button variant="outline-secondary" onClick={this.generateUuid}>UUID</Button>
                            </InputGroup.Append>
                        </InputGroup>
                    </Col>
                </Form.Group>
            </React.Fragment>
        );
    }

    private generateUuid() {
        this._input.value = uuidv4();
    }

    isValid(): boolean {
        // TODO
        return true;
    }

    toJSON(): any {
        const value = this._input.value as string;
        return value;
    }

    get value(): any {
        return this.state.value;
    }

    set value(val: any) {
        this.setState({ value: val });
    }

}

import * as React from "react";
import { SmartContractFunctionProperty } from './smart-contract-function';
import SmartContractArrayPropertyView from './smart-contract-array-property-view';
import SmartContractIntegerPropertyView from './smart-contract-integer-property-view';
import SmartContractNumberPropertyView from './smart-contract-number-property-view';
import SmartContractStringPropertyView from './smart-contract-string-property-view';

import './smart-contract-property-view.scss';

export interface ISmartContractPropertyView {
    isValid(): boolean;
    toJSON(): any;
    value: any;
}

interface SmartContractPropertyViewProps {
    property: SmartContractFunctionProperty,
    index: number,
    value: any,
    onChange(value: any): void
}

export class SmartContractPropertyView extends React.Component<SmartContractPropertyViewProps> implements ISmartContractPropertyView {

    constructor(props: any) {
        super(props);
    }

    _input;
    _propertyView: ISmartContractPropertyView;

    render() {
        let propComponent;
        if (this.props.property.type == 'string') {
            propComponent = <SmartContractStringPropertyView {...this.props} ref={(c) => { this._propertyView = c; }}></SmartContractStringPropertyView>;
        } else if (this.props.property.type == 'number') {
            propComponent = <SmartContractNumberPropertyView {...this.props} ref={(c) => { this._propertyView = c; }}></SmartContractNumberPropertyView>;
        } else if (this.props.property.type == 'integer') {
            propComponent = <SmartContractIntegerPropertyView {...this.props} ref={(c) => { this._propertyView = c; }}></SmartContractIntegerPropertyView>;
        } else if (this.props.property.type == 'object') {
            // TODO
            propComponent = <span>Unimplemented data type</span>
        } else if (this.props.property.type == 'array') {
            propComponent = <SmartContractArrayPropertyView {...this.props} ref={(c) => { this._propertyView = c; }}></SmartContractArrayPropertyView>;
        } else if (this.props.property.type == 'boolean') {
            //propComponent = <SmartContractBoolPropertyView {...this.props} ref={(c) => { this._propertyView = c; }}></SmartContractBoolPropertyView>;
            // TODO
            propComponent = <span>Unimplemented data type</span>
        } else if (this.props.property.type == 'null') {
            // TODO
            propComponent = <span>Unimplemented data type</span>
        }

        return (
            <React.Fragment>
                {propComponent}
            </React.Fragment>
        );
    }

    isValid(): boolean {
        return (this._propertyView ? this._propertyView.isValid() : true);
    }

    toJSON(): any {
        return (this._propertyView ? this._propertyView.toJSON() : null);
    }

    get value(): any {
        if (this._propertyView) {
            return this._propertyView.value;
        } else {
            return undefined;
        }
    }

    set value(val: any) {
        if (this._propertyView) {
            this._propertyView.value = val;
        }
    }

}


/*
    toJSON(): any {
        var json: any;

        const value = this._input.value as string;
        if (this.props.property.type == 'string') {
            json = value;
        } else if (this.props.property.type == 'number') {
            json = Number(value);
        } else if (this.props.property.type == 'integer') {
            json = Number(value);
        } else if (this.props.property.type == 'object') {
            json = {}; // TODO
        } else if (this.props.property.type == 'array') {
            json = []; // TODO
        } else if (this.props.property.type == 'boolean') {
            json = false; // TODO
        } else if (this.props.property.type == 'null') {
            json = null;
        }

        return json;
    }
*/

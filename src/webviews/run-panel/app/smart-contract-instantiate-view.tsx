import * as React from "react";
import './smart-contract-instantiate-view.scss';

import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-twilight";
import ReactJson from "react-json-view";
import { Button, ButtonGroup, Card, Col, Container, Dropdown, DropdownButton, Form, Row, Tabs, Tab } from 'react-bootstrap';
import { FaPlay, FaSpinner } from 'react-icons/fa';

import { SmartContractInfo } from './smart-contract-info';
import { SigningKey } from './signing-key';
import { Utils } from './app-utils';

import { SmartContractPropertyView } from './smart-contract-property-view';

interface SmartContractInstantiateViewProps {
    contractInfo: SmartContractInfo,
    signingKeys: SigningKey[]
}

interface SmartContractInstantiateViewState {
    busy: boolean,
    args: any,
    result: any,
    activeKey: string,
    signingKey: string
}

export default class SmartContractInstantiateView extends React.Component<SmartContractInstantiateViewProps, SmartContractInstantiateViewState> {

    constructor(props: any) {
        super(props);

        this.instantiateSmartContract = this.instantiateSmartContract.bind(this);

        this.state = {
            busy: false,
            args: this.props.contractInfo.defaultInitArgs,
            result: {},
            activeKey: 'builder',
            signingKey: (props.signingKeys[0] ? props.signingKeys[0].name : '')
        };

        this._jsonRefName = React.createRef();

        this.updateArguments(this.state.activeKey);
    }

    _jsonRefName;
    _propertyViews: {[k: string]: SmartContractPropertyView} = {};

    render() {
        const keys = this.props.signingKeys;

        const renderRunButtonContents = () => {
            if (!this.state.busy) {
                return <span><FaPlay /></span>;
            } else {
                return <span><FaSpinner className="spinner" /></span>;
            }
        }

        const renderRunButtons = () => {
            return <ButtonGroup className="float-right">
                <Button variant="primary" type="button" disabled={this.state.busy} onClick={this.instantiateSmartContract}>
                    {renderRunButtonContents()}
                </Button>
                <DropdownButton as={ButtonGroup} variant="secondary" disabled={this.state.busy} title={this.state.signingKey}>
                    {keys.map((key, idx) =>
                        <Dropdown.Item onSelect={setSigningKey} eventKey={key.name} key={key.name}>{key.name}</Dropdown.Item>
                    )}
                </DropdownButton>
            </ButtonGroup>;
        }

        const onPropertyChange = (name, value) => {
            if (this.state.args && this.state.args.hasOwnProperty(name)) {
                var argmod = this.state.args;
                argmod[name] = value;
                this.setState({
                    args: argmod
                });
            }
        }

        const onJSONChange = (j) => {
            try {
                var argmod = JSON.parse(j);
                this.setState({
                    args: argmod
                });
            } catch (ex) {
            }
        }

        const getValue = (name) => {
            if (this.state.args && this.state.args.hasOwnProperty(name)) {
                return this.state.args[name];
            } else {
                return undefined;
            }
        }

        const renderInstantiateArgumentsContents = () => {
            if (this.props.contractInfo.initFunction.properties.length > 0) {
                return <Tabs id="sc-function" variant="pills" activeKey={this.state.activeKey} onSelect={(k) => this.setActiveKey(k)}>
                    <Tab title="Builder" eventKey="builder" active={this.isActiveKey("builder")}>
                        <div className="paramsPane">
                            <Form>
                                {this.props.contractInfo.initFunction.properties.map((prop, idx) =>
                                    <SmartContractPropertyView key={prop.name} property={prop} index={idx} value={getValue(prop.name)} onChange={(value) => onPropertyChange(prop.name, value)} ref={(c) => { this._propertyViews[prop.name] = c; }}></SmartContractPropertyView>
                                )}
                            </Form>
                        </div>
                    </Tab>
                    <Tab title="JSON" eventKey="json" active={this.isActiveKey("json")}>
                        <div className="paramsPane">
                            <AceEditor
                                mode="json"
                                theme="twilight"
                                name="json-editor"
                                editorProps={{ $blockScrolling: true }}
                                tabSize={2}
                                className="paramsJSONEditor"
                                ref={this._jsonRefName}
                                style={{width: "auto"}}
                                onChange={(j) => onJSONChange(j)}
                            />
                        </div>
                    </Tab>
                </Tabs>;
            } else {
                return <div className="noParams">No Parameters</div>;
            }
        }

        const setSigningKey = (k) => {
            this.setState({ signingKey: k });
        };

        return (
            <React.Fragment>
                <Card className="scInstantiate">
                    <Card.Header>Instantiate Contract</Card.Header>
                    <Card.Body>
                        <Container className="sectionHeader" >
                            <Row className="clearfix align-items-center">
                                <Col sm={3}><h5 className="sectionHeaderTitle">Arguments</h5></Col>
                                <Col>{renderRunButtons()}</Col>
                            </Row>
                        </Container>
                        <hr className="scFunctionHR"/>
                        {renderInstantiateArgumentsContents()}
                        <h5>Result</h5><hr className="scFunctionHR"/>
                        <ReactJson src={this.state.result} theme="ocean" collapsed={2} />
                    </Card.Body>
                </Card>
            </React.Fragment>
        );
    }

    private setActiveKey (k) {
        this.setState({ activeKey: k });
        this.updateArguments(k);
    }

    private updateArguments(k) {
        if (k == 'json') {
            if (this._jsonRefName) {
                this._jsonRefName.current.editor.setValue(JSON.stringify(this.state.args, null, 2), 1);
            }
        } else {
            this.props.contractInfo.initFunction.properties.forEach((prop) => {
                if (this._propertyViews && this._propertyViews[prop.name]) {
                    this._propertyViews[prop.name].value = this.state.args[prop.name];
                }
            });
        }
    }

    private isActiveKey (k) {
        return (this.state.activeKey == k);
    };

    private instantiateSmartContract() {
        console.log(`Instantiate smart contract: ${this.props.contractInfo.name}`);

        this.setState({ 
            busy: true
        });

        // TODO: validate the arguments?

        Utils.instantiateContract(this.props.contractInfo, this.state.args, this.state.signingKey).then((result: any) => {
            this.setState({ busy: false, result: result });
        }).catch((err) => {
            console.log(`Error instantiating contract ${this.props.contractInfo.name}: ${err.message}`);
            this.setState({ busy: false, result: {} });
        });
    }

}

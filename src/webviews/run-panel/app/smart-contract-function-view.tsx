import * as React from "react";
import ReactJson from "react-json-view";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-twilight";
import { FaPlay, FaSpinner } from 'react-icons/fa';
import { Card, Dropdown, DropdownButton, Form, InputGroup, Button, ButtonGroup, Tabs, Tab, Container, Row, Col } from 'react-bootstrap';
import { SmartContractPropertyView } from './smart-contract-property-view';
import { Coin, Utils } from './app-utils';
import { SmartContractFunction, SmartContractFunctionProperty, SmartContractFunctionType } from './smart-contract-function';
import { ProvenanceMarker } from './provenance-marker';
import { SigningKey } from './signing-key';

import './smart-contract-function-view.scss';

interface SmartContractFunctionViewProps {
    function: SmartContractFunction,
    contractAddress: string,
    signingKeys: SigningKey[],
    markers: ProvenanceMarker[],
    index: number
}

interface SmartContractFunctionViewState {
    busy: boolean,
    result: any,
    activeKey: string,
    signingKey: string,
    shouldSendCoin: boolean,
    sendCoin: Coin
}

export default class SmartContractFunctionView extends React.Component<SmartContractFunctionViewProps, SmartContractFunctionViewState> {

    constructor(props: any) {
        super(props);

        this.runSmartContract = this.runSmartContract.bind(this);

        this.state = {
            busy: false,
            result: {},
            activeKey: 'builder',
            signingKey: (props.signingKeys[0] ? props.signingKeys[0].name : ''),
            shouldSendCoin: false,
            sendCoin: {
                denom: (props.markers[0] ? props.markers[0].denom : ''),
                amount: 0
            }
        }

        this._jsonRefName = React.createRef();
    }

    _coinAmountInput;
    _jsonRefName;
    _propertyViews: {[k: string]: SmartContractPropertyView} = {};

    render() {
        const func = this.props.function;
        //const idx = this.props.index;
        const keys = this.props.signingKeys;
        const markers = this.props.markers;

        const renderRunButtonContents = () => {
            if (!this.state.busy) {
                return <span><FaPlay /></span>;
            } else {
                return <span><FaSpinner className="spinner" /></span>;
            }
        }

        const renderRunButtons = () => {
            if (func.type == SmartContractFunctionType.Execute) {
                return <ButtonGroup className="float-right">
                    <Button variant="primary" type="button" disabled={this.state.busy} onClick={this.runSmartContract}>
                        {renderRunButtonContents()}
                    </Button>
                    <DropdownButton as={ButtonGroup} variant="secondary" disabled={this.state.busy} title={this.state.signingKey}>
                        {keys.map((key, idx) =>
                            <Dropdown.Item onSelect={setSigningKey} eventKey={key.name} key={key.name}>{key.name}</Dropdown.Item>
                        )}
                    </DropdownButton>
                </ButtonGroup>;
            }
            else {
                return <Button className="float-right" variant="primary" type="button" disabled={this.state.busy} onClick={this.runSmartContract}>
                    {renderRunButtonContents()}
                </Button>;
            }
        }

        const setShouldSendCoin = (checked) => {
            this.setState({ shouldSendCoin: checked });
        }

        const setSendCoinMarker = (m) => {
            this.setState({ sendCoin: {
                denom: m,
                amount: this.state.sendCoin.amount
            }});
        }

        const renderSendCoin = () => {
            if (func.type == SmartContractFunctionType.Execute) {
                return <InputGroup className="float-left">
                    <InputGroup.Prepend>
                        <InputGroup.Checkbox onChange={e => setShouldSendCoin(e.currentTarget.checked)} />
                    </InputGroup.Prepend>
                    <Form.Control type="text" placeholder="amount" disabled={!this.state.shouldSendCoin} ref={(c) => this._coinAmountInput = c} />
                    <DropdownButton as={InputGroup.Append} variant="secondary" title={this.state.sendCoin.denom} disabled={!this.state.shouldSendCoin}>
                        {markers.map((marker, idx) =>
                            <Dropdown.Item onSelect={setSendCoinMarker} eventKey={marker.denom} key={marker.denom}>{marker.denom}</Dropdown.Item>
                        )}
                    </DropdownButton>
                </InputGroup>;
            } else {
                return <span></span>;
            }
        }

        const onPropertyChange = (name, value) => {
            // TODO
        }

        const getValue = (name) => {
            /* TODO
            if (this.state.args.hasOwnProperty(name)) {
                return this.state.args[name];
            } else {
                return '';
            }
            */
            return '';
        }

        const renderFunctionParametersContents = () => {
            if (this.props.function.properties.length > 0) {
                return <Tabs id="sc-function" variant="pills" activeKey={this.state.activeKey} onSelect={setActiveKey}>
                    <Tab title="Builder" eventKey="builder" active={isActiveKey("builder")}>
                        <div className="paramsPane">
                            <Form>
                                {this.props.function.properties.map((prop, idx) =>
                                    <SmartContractPropertyView key={prop.name} property={prop} index={idx} value={getValue(prop.name)} onChange={(value) => onPropertyChange(prop.name, value)} ref={(c) => { this._propertyViews[prop.name] = c; }}></SmartContractPropertyView>
                                )}
                            </Form>
                        </div>
                    </Tab>
                    <Tab title="JSON" eventKey="json" active={isActiveKey("json")}>
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
                            />
                        </div>
                    </Tab>
                </Tabs>;
            } else {
                return <div className="noParams">No Parameters</div>;
            }
        }

        const toDefaultJSON = (props: SmartContractFunctionProperty[]) => {
            var defObj: {[k: string]: any} = {};
            props.forEach((prop) => {
                if (prop.type == 'string') {
                    defObj[prop.name] = '';
                } else if (prop.type == 'number') {
                    defObj[prop.name] = 0;
                } else if (prop.type == 'integer') {
                    defObj[prop.name] = 0;
                } else if (prop.type == 'object') {
                    defObj[prop.name] = toDefaultJSON(prop.properties);
                } else if (prop.type == 'array') {
                    defObj[prop.name] = [];
                } else if (prop.type == 'boolean') {
                    defObj[prop.name] = false;
                } else if (prop.type == 'null') {
                    defObj[prop.name] = null;
                }
            });
            return defObj;
        }

        const setActiveKey = (k) => {
            this.setState({ activeKey: k });
            if (k == 'json') {
                /*
                if (this._jsonRefName.current.editor.getValue().length == 0) {
                    console.log('SET DEFAULT JSON');
                    const func = this.props.function;
                    this._jsonRefName.current.editor.setValue(JSON.stringify(toDefaultJSON(func.properties), null, 2), 1);
                } else {
                    console.log('SET JSON FROM BUILDER');
                    var builderJSON: {[k: string]: any} = {};
                    for (var key in this._propertyViews) {
                        builderJSON[key] = this._propertyViews[key].toJSON();
                    }
                    this._jsonRefName.current.editor.setValue(JSON.stringify(builderJSON, null, 2), 1);
                }
                */

                console.log('SET JSON FROM BUILDER');
                var builderJSON: {[k: string]: any} = {};
                for (var key in this._propertyViews) {
                    builderJSON[key] = this._propertyViews[key].toJSON();
                }
                this._jsonRefName.current.editor.setValue(JSON.stringify(builderJSON, null, 2), 1);
            } else {
                console.log('SET BUILDER FROM JSON');
                // TODO
            }
        };

        const isActiveKey = (k) => {
            return (this.state.activeKey == k);
        };

        const setSigningKey = (k) => {
            this.setState({ signingKey: k });
        };

        return (
            <React.Fragment>
                <Card className="scFunction">
                    <Card.Header>{Utils.snakeToTitle(func.name)}</Card.Header>
                    <Card.Body>
                        <Container className="sectionHeader" >
                            <Row className="clearfix align-items-center">
                                <Col sm={3}><h5 className="sectionHeaderTitle">Parameters</h5></Col>
                                <Col>{renderSendCoin()}</Col>
                                <Col>{renderRunButtons()}</Col>
                            </Row>
                        </Container>
                        <hr className="scFunctionHR"/>
                        {renderFunctionParametersContents()}
                        <h5>Result</h5><hr className="scFunctionHR"/>
                        <ReactJson src={this.state.result} theme="ocean" collapsed={2} />
                    </Card.Body>
                </Card>
            </React.Fragment>
        );
    }



    private runSmartContract() {
        console.log(`Run smart contract function: ${this.props.function.name}`);

        this.setState({ 
            busy: true,
            result: {}
        });

        var funcMessage: {[k: string]: any} = {};
        if (this.state.activeKey == 'json') {
            funcMessage = JSON.parse(this._jsonRefName.current.editor.getValue());
        } else {
            // build the message
            for (var key in this._propertyViews) {
                funcMessage[key] = this._propertyViews[key].toJSON();
            }
        }

        // TODO: validate the properties?

        var coin: (Coin | undefined) = undefined;
        if (this.state.shouldSendCoin) {
            this.setState({ sendCoin: {
                amount: Number(this._coinAmountInput.value),
                denom: this.state.sendCoin.denom
            } });
            coin = {
                amount: Number(this._coinAmountInput.value),
                denom: this.state.sendCoin.denom
            };
        }

        var address: (string | undefined) = undefined;
        if (this.props.contractAddress.length > 0) {
            address = this.props.contractAddress;
        }

        Utils.runFunction(this.props.function, funcMessage, address, this.state.signingKey, coin).then((result: any) => {
            this.setState({ busy: false, result: result });
        }).catch((err) => {
            console.log(`Error executing function ${this.props.function.name}: ${err.message}`);
            this.setState({ busy: false, result: {} });
        });
    }

}

import * as React from "react";
import './smart-contract-info-view.scss';

import { Container, Form, Row, Col, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaExclamationTriangle } from 'react-icons/fa';
import Dialog from 'react-bootstrap-dialog';

import { SmartContractInfo } from './smart-contract-info';
import { Utils } from './app-utils';

interface SmartContractInfoViewProps {
    contractInfo: SmartContractInfo,
    instances: SmartContractInfo[],
    onContractSelected: ((contract: SmartContractInfo) => void)
}

interface SmartContractInfoViewState {
    selectedContract: (SmartContractInfo | undefined)
}

export default class SmartContractInfoView extends React.Component<SmartContractInfoViewProps, SmartContractInfoViewState> {

    constructor(props: any) {
        super(props);

        this.state = {
            selectedContract: ((this.props.contractInfo.address.length > 0) ? this.props.contractInfo : undefined)
        };
    }

    _input_contractInstance;
    confirmMigrateDialog: Dialog;

    componentDidUpdate(oldProps: SmartContractInfoViewProps) {
        if (oldProps.instances != this.props.instances) {
            if (this.props.instances.length > 0 && this.state.selectedContract == undefined) {
                this.setState({
                    selectedContract: this.props.instances[0]
                });
                this.props.onContractSelected(this.props.instances[0]);
            }
        }
    }

    render() {
        const instances = this.props.instances;
        const info = this.props.contractInfo;

        const selectContract = (addr) => {
            var contract = this.props.instances.find((instance) => { return instance.address == addr; })
            this.setState({
                selectedContract: contract
            });
            this.props.onContractSelected(contract);
        };

        const isContractOutOfDate = (contract) => {
            var outOfDate = false;
            if (contract) {
                outOfDate = (contract.codeId < contract.latestCodeId);
            }
            return outOfDate;
        };

        const migrateContract = (c) => {
            this.confirmMigrateDialog.show({
                title: 'Confirm migrate contract',
                body: `Are you sure you want to migrate the contract from code id ${c.codeId} to ${c.latestCodeId}?`,
                bsSize: 'small',
                actions: [
                    Dialog.OKAction(() => {
                        Utils.migrateContract(c.address, c.latestCodeId).catch((err) => {
                            //Utils.showAlert(Alert.Danger, `Unable to migrate contract from code id ${c.codeId} to ${c.latestCodeId}`, err.message, true);
                        });
                    }),
                    Dialog.CancelAction()
                ]
            });
        };

        const renderMigrateContractTooltip = (props) => (
            <Tooltip id="migrate-button-tooltip" {...props}>Contract out of date. Migrate contract?</Tooltip>
        );

        return (
            <React.Fragment>
                <Container className="infoView" fluid>
                    <Row>
                        <Col sm={3}>
                            <svg color="#3F80F3" width="50px" viewBox="0 0 22 31" fill="none">
                                <path d="M16.5 3.38182L11 0L5.5 3.38182L0 6.76364V12.4V18.0364V27.6182L5.5 31V21.4182L11 24.8L16.5 21.4182L22 18.0364V12.4V6.76364L16.5 3.38182ZM16.5 15.7818L11 19.1636L5.5 15.7818V10.1455L11 6.76364L16.5 10.1455V15.7818Z" fill="currentColor"></path>
                            </svg>
                        </Col>
                        {(info.isSingleton || instances.length <= 1) && <Col sm={9}>
                            <h3>{info.name}</h3>
                            <Container fluid>
                                <Row className="contractInfoField">
                                    <Col sm={3}>Address:</Col>
                                    <Col sm={9}>{info.address}</Col>
                                </Row>
                                <Row className="contractInfoField">
                                    <Col sm={3}>Source:</Col>
                                    <Col sm={9}><a href={info.source} className="source">{info.source}</a></Col>
                                </Row>
                                <Row className="contractInfoField">
                                    <Col sm={3}>Code Id:</Col>
                                    <Col sm={9}>
                                        {info.codeId} (latest: {info.latestCodeId})
                                        {isContractOutOfDate(info) && <span>MIGRATE</span>}
                                    </Col>
                                </Row>
                            </Container>
                        </Col>}
                        {(!info.isSingleton && instances.length > 1) && <Col sm={9}>
                            <h3>{info.name}</h3>
                            <Container fluid>
                                <Row className="nonSingletonContractInfoField">
                                    <Col sm={3}>Address:</Col>
                                    <Col sm={9}>
                                        <Form.Control 
                                            custom
                                            as="select"
                                            placeholder=""
                                            size="sm"
                                            ref={(c) => this._input_contractInstance = c}
                                            value={this.state.selectedContract ? this.state.selectedContract.address : ''}
                                            onChange={e => selectContract(e.currentTarget.value)}
                                        >
                                            {instances.map((instance, idx) =>
                                                <option value={instance.address}>{instance.address}</option>
                                            )}
                                        </Form.Control>
                                    </Col>
                                </Row>
                                <Row className="nonSingletonContractInfoField">
                                    <Col sm={3}>Source:</Col>
                                    <Col sm={9}><a href={this.state.selectedContract ? this.state.selectedContract.source : '#'} className="source">{this.state.selectedContract ? this.state.selectedContract.source : ''}</a></Col>
                                </Row>
                                <Row className="nonSingletonContractInfoField">
                                    <Col sm={3}>Code Id:</Col>
                                    <Col sm={9}>
                                        {this.state.selectedContract ? this.state.selectedContract.codeId : 0} (latest: {this.state.selectedContract ? this.state.selectedContract.latestCodeId : 0})
                                        {isContractOutOfDate(this.state.selectedContract) && <OverlayTrigger
                                            placement="bottom"
                                            delay={{ show: 250, hide: 400 }}
                                            overlay={renderMigrateContractTooltip}
                                        >
                                            <span> <a href="#" className="actions" onClick={() => migrateContract(this.state.selectedContract)}><FaExclamationTriangle /></a></span>
                                        </OverlayTrigger>}
                                    </Col>
                                </Row>
                            </Container>
                        </Col>}
                    </Row>
                </Container>
                <Dialog ref={(el) => { this.confirmMigrateDialog = el }} />
            </React.Fragment>
        );
    }

}

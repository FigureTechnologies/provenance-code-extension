import * as React from "react";
import './provenance-home-view.scss';

import { Button, ButtonGroup, Container, Col, Row } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa';
import { Alert, ChainViewAppBinding } from './app-binding';
import { Utils } from './app-utils';

import { GitUserConfig } from "./git-user-config";
import { SmartContractTemplate } from './smart-contract-template';

import NewProjectModal from './new-project-modal';

interface ProvenanceHomeViewProps {
    appBinding: ChainViewAppBinding,
    templates: SmartContractTemplate[],
    recentProjects: string[],
    gitUserConfig: GitUserConfig
}

interface ProvenanceHomeViewState {
    newProjectModalShown: boolean
}

export default class ProvenanceHomeView extends React.Component<ProvenanceHomeViewProps, ProvenanceHomeViewState> {

    constructor(props: any) {
        super(props);

        this.state = {
            newProjectModalShown: false
        };
    }

    render() {
        const recentProjects = this.props.recentProjects;

        const showNewProjectModal = () => {
            this.setState({
                newProjectModalShown: true
            });
        };

        const hideNewProjectModal = () => {
            this.setState({
                newProjectModalShown: false
            });
        };

        const openProject = (projectPath) => {
            Utils.openProject(projectPath).then(() => {
            }).catch((err) => {
                Utils.showAlert(Alert.Danger, `Error opening project`, `${err.message}`, true);
            });
        }

        const clearRecentProjects = () => {
            Utils.clearRecentProjects().finally(() => {})
        }

        return (
            <React.Fragment>
                <Container fluid>
                    <Row>
                        <Col sm={3}>
                            <svg color="#FFFFFF" height="100px" viewBox="0 0 22 31" fill="none">
                                <path d="M16.5 3.38182L11 0L5.5 3.38182L0 6.76364V12.4V18.0364V27.6182L5.5 31V21.4182L11 24.8L16.5 21.4182L22 18.0364V12.4V6.76364L16.5 3.38182ZM16.5 15.7818L11 19.1636L5.5 15.7818V10.1455L11 6.76364L16.5 10.1455V15.7818Z" fill="currentColor"></path>
                            </svg>
                        </Col>
                        <Col sm={9}>
                            <div className="title">PROVENANCE</div>
                            <div className="titleSubHeading">Open-source ecosystem for developing and deploying blockchain-based DeFi apps.</div>
                        </Col>
                    </Row>
                </Container>
                <Container fluid>
                    <Row>
                        <Col sm={4}>
                            <hr className="hr-text" data-content="Quick Start" />
                            <div>
                                <ButtonGroup className="d-flex">
                                    <Button variant="light" onClick={() => showNewProjectModal()}><FaPlus />&nbsp;&nbsp;New Project</Button>
                                </ButtonGroup>
                            </div>
                        </Col>
                        <Col sm={8}>
                            <hr className="hr-text" data-content="Recent Projects" />
                            {recentProjects.length == 0 && <div>
                                No recent projects
                            </div>}
                            {recentProjects.length > 0 && <div>
                                {recentProjects.map((recentProject, idx) => 
                                    <div><a href="#" onClick={() => openProject(recentProject)}>{recentProject}</a></div>
                                )}
                                <div><a className="clear-recent-link" href="#" onClick={() => clearRecentProjects()}>Clear recent</a></div>
                            </div>}
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <hr className="hr-text" data-content="Recent News" />
                            <div>
                                    
                            </div>
                        </Col>
                    </Row>
                </Container>
                <NewProjectModal
                    show={this.state.newProjectModalShown}
                    templates={this.props.templates}
                    gitUserConfig={this.props.gitUserConfig}
                    onCancel={() => hideNewProjectModal()}
                    onProjectCreated={(projectName, templateName) => { 
                        hideNewProjectModal();
                        Utils.showAlert(Alert.Success, `Created new project "${projectName}"`, `Created new project "${projectName}" from template "${templateName}"`, true);
                    }}
                    onError={(err) => {
                        Utils.showAlert(Alert.Danger, `Unable to create new project`, err.message, true);
                    }}
                ></NewProjectModal>
            </React.Fragment>
        );
    }

}

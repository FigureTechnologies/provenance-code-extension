import * as React from "react";
import './app.scss';

import { Alert, Col, Container, Form, Nav, Navbar, Row } from 'react-bootstrap';
import { ProvenanceKey } from './provenance-key';
import { ProvenanceMarker } from './provenance-marker';
import { SmartContractTemplate } from "./smart-contract-template";
import { AlertEvent, ChainViewAppBinding, Command, Event } from './app-binding';
import { Utils } from './app-utils';

import { GitUserConfig } from "./git-user-config";
import ProvenanceHomeView from './provenance-home-view';
import ProvenanceAccountsView from './provenance-accounts-view';
import ProvenanceMarkersView from './provenance-markers-view';

const HOME_VIEW: string = 'home';
const ACCOUNTS_VIEW: string = 'accounts';
const MARKERS_VIEW: string = 'markers';

declare global {
    interface Window {
        acquireVsCodeApi(): any
    }
}

const vscode = window.acquireVsCodeApi();

interface AppProps {
}

interface AppState {
    keys: ProvenanceKey[],
    markers: ProvenanceMarker[],
    gitUserConfig: GitUserConfig,
    templates: SmartContractTemplate[],
    recentProjects: string[],
    showOnStartup: boolean,
    activeView: string,
    alerts: AlertEvent[]
}

export class App extends React.Component<AppProps, AppState> {

    private appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance(vscode);

    constructor(props) {
        super(props);

        this.state = {
            keys: this.appBinding.keys,
            markers: this.appBinding.markers,
            gitUserConfig: this.appBinding.gitUserConfig,
            templates: this.appBinding.templates,
            recentProjects: this.appBinding.recentProjects,
            showOnStartup: this.appBinding.showOnStartupConfig,
            activeView: HOME_VIEW,
            alerts: []
        };

        this.appBinding.keysObservable.subscribe((keys) => {
            this.setState({
                keys: keys
            });
        });

        this.appBinding.markersObservable.subscribe((markers) => {
            this.setState({
                markers: markers
            });
        });

        this.appBinding.gitUserConfigObservable.subscribe((gitUserConfig) => {
            this.setState({
                gitUserConfig: gitUserConfig
            });
        });

        this.appBinding.templatesObservable.subscribe((templates) => {
            this.setState({
                templates: templates
            });
        });

        this.appBinding.recentProjectsObservable.subscribe((recentProjects) => {
            this.setState({
                recentProjects: recentProjects
            });
        });

        this.appBinding.showOnStartupConfigObservable.subscribe((showOnStartup) => {
            this.setState({
                showOnStartup: showOnStartup
            });
        });

        this.appBinding.alertsObservable.subscribe((alerts) => {
            this.setState({
                alerts: alerts
            });
        });

        window.addEventListener('message', (event) => {
            this.appBinding.eventListener(event);
        });

        const readyMessage: Event = {
            command: Command.Ready,
            data: undefined
        };
        console.log('POSTING READY EVENT');
        vscode.postMessage(readyMessage);
    }

    render() {
        const setActiveView = (v) => {
            this.setState({ activeView: v });
        };

        const clearAlert = (id) => {
            console.log(`Close alert ${id}`);
            this.appBinding.clearAlert(id);
        };

        const toggleShowOnStartup = () => {
            var newState = !this.state.showOnStartup;
            this.setState({
                showOnStartup: newState
            });
            Utils.setShowOnStartup(newState).finally(() => {});
        }

        return (
            <Container>
                <Navbar collapseOnSelect expand="sm" bg="dark" variant="dark" fixed="top">
                    <Navbar.Brand>
                        <a href="https://provenance.io/">
                            <svg color="#3F80F3" height="30px" viewBox="0 0 22 31" fill="none">
                                <path d="M16.5 3.38182L11 0L5.5 3.38182L0 6.76364V12.4V18.0364V27.6182L5.5 31V21.4182L11 24.8L16.5 21.4182L22 18.0364V12.4V6.76364L16.5 3.38182ZM16.5 15.7818L11 19.1636L5.5 15.7818V10.1455L11 6.76364L16.5 10.1455V15.7818Z" fill="currentColor"></path>
                            </svg>
                        </a>
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                    <Navbar.Collapse id="responsive-navbar-nav">
                        <Nav className="mr-auto">
                            <Nav.Link active={this.state.activeView == HOME_VIEW} onClick={() => setActiveView(HOME_VIEW)}>Home</Nav.Link>
                            <Nav.Link active={this.state.activeView == ACCOUNTS_VIEW} onClick={() => setActiveView(ACCOUNTS_VIEW)}>Accounts</Nav.Link>
                            <Nav.Link active={this.state.activeView == MARKERS_VIEW} onClick={() => setActiveView(MARKERS_VIEW)}>Markers</Nav.Link>
                        </Nav>
                        <Nav>
                            <Form>
                                <Form.Switch 
                                    id="show-on-startup"
                                    label="Show on startup"
                                    checked={this.state.showOnStartup}
                                    onChange={toggleShowOnStartup}
                                />
                            </Form>
                        </Nav>
                    </Navbar.Collapse>
                </Navbar>
                <Container className="rootContainer" fluid>
                    {this.state.activeView == HOME_VIEW && <ProvenanceHomeView appBinding={this.appBinding} templates={this.state.templates} recentProjects={this.state.recentProjects} gitUserConfig={this.state.gitUserConfig}></ProvenanceHomeView>}
                    {this.state.activeView == ACCOUNTS_VIEW && <ProvenanceAccountsView appBinding={this.appBinding} accountKeys={this.state.keys}></ProvenanceAccountsView>}
                    {this.state.activeView == MARKERS_VIEW && <ProvenanceMarkersView appBinding={this.appBinding} accountKeys={this.state.keys} markers={this.state.markers}></ProvenanceMarkersView>}
                </Container>
                <Container className="alertContainer" style={{maxWidth: "initial"}}>
                    {this.state.alerts.map((alert, idx) => 
                        <Row>
                            <Col>
                                <Alert variant={alert.type} dismissible={alert.dismissable} onClose={() => {clearAlert(alert.id)}}>
                                    <Alert.Heading>{alert.title}</Alert.Heading>
                                    <div className="alertBody">{alert.body}</div>
                                </Alert>
                            </Col>
                        </Row>
                    )}
                </Container>
            </Container>
        );
    }

}

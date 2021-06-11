import * as React from "react";
import './app.scss';

import { Container, Nav, Navbar } from 'react-bootstrap';
import { ProvenanceKey } from './provenance-key';
import { ChainViewAppBinding, Command, Event } from './app-binding';

import ProvenanceAccountsView from './provenance-accounts-view';
import ProvenanceBankView from './provenance-bank-view';
import ProvenanceMarkersView from './provenance-markers-view';

const ACCOUNTS_VIEW: string = 'accounts';
const BANK_VIEW: string = 'bank';
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
    activeView: string
}

export class App extends React.Component<AppProps, AppState> {

    private appBinding: ChainViewAppBinding = ChainViewAppBinding.getReactInstance(vscode);

    constructor(props) {
        super(props);

        this.state = {
            keys: this.appBinding.keys,
            activeView: ACCOUNTS_VIEW
        };

        this.appBinding.keysObservable.subscribe((keys) => {
            this.setState({
                keys: keys
            });
        });

        // TODO

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

        return (
            <Container>
                <Navbar collapseOnSelect expand="sm" bg="dark" variant="dark" fixed="top">
                    <Navbar.Brand>
                        <svg color="#3F80F3" height="30px" viewBox="0 0 22 31" fill="none">
                            <path d="M16.5 3.38182L11 0L5.5 3.38182L0 6.76364V12.4V18.0364V27.6182L5.5 31V21.4182L11 24.8L16.5 21.4182L22 18.0364V12.4V6.76364L16.5 3.38182ZM16.5 15.7818L11 19.1636L5.5 15.7818V10.1455L11 6.76364L16.5 10.1455V15.7818Z" fill="currentColor"></path>
                        </svg>
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                    <Navbar.Collapse id="responsive-navbar-nav">
                        <Nav className="mr-auto">
                            <Nav.Link active={this.state.activeView == ACCOUNTS_VIEW} onClick={() => setActiveView(ACCOUNTS_VIEW)}>Accounts</Nav.Link>
                            <Nav.Link active={this.state.activeView == BANK_VIEW} onClick={() => setActiveView(BANK_VIEW)}>Bank</Nav.Link>
                            <Nav.Link active={this.state.activeView == MARKERS_VIEW} onClick={() => setActiveView(MARKERS_VIEW)}>Markers</Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Navbar>
                <Container className="rootContainer" fluid>
                    {this.state.activeView == ACCOUNTS_VIEW && <ProvenanceAccountsView appBinding={this.appBinding} accountKeys={this.state.keys}></ProvenanceAccountsView>}
                    {this.state.activeView == BANK_VIEW && <ProvenanceBankView></ProvenanceBankView>}
                    {this.state.activeView == MARKERS_VIEW && <ProvenanceMarkersView></ProvenanceMarkersView>}
                </Container>
            </Container>
        );
    }

}

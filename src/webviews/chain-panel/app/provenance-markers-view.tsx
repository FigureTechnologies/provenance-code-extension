import * as React from "react";
import './provenance-markers-view.scss';
import { FaPlus, FaTrashAlt, FaCoins, FaFireAlt, FaArrowCircleDown } from 'react-icons/fa';
import Dialog from 'react-bootstrap-dialog';

import { Breadcrumb, Button, Card, OverlayTrigger, Table, Tooltip } from 'react-bootstrap';
import { Alert, ChainViewAppBinding } from './app-binding';
import { ProvenanceAccountBalance } from './provenance-account-balance';
import { ProvenanceKey } from './provenance-key';
import { ProvenanceMarker } from './provenance-marker';
import { Utils } from './app-utils';

import MarkerDetailsView from './marker-details-view';
import AddMarkerModal from './add-marker-modal';
import { MintOrBurnMarkerModal, MintOrBurnMode } from './mint-or-burn-marker-modal';
import { WithdrawMarkerModal } from './withdraw-marker-modal';

interface ProvenanceMarkerDetails {
    marker: ProvenanceMarker,
    balances: ProvenanceAccountBalance[]
}

interface ProvenanceMarkersViewProps {
    appBinding: ChainViewAppBinding,
    accountKeys: ProvenanceKey[],
    markers: ProvenanceMarker[]
}

interface ProvenanceMarkersViewState {
    markerDetails: (ProvenanceMarkerDetails | undefined),

    addMarkerModalShown: boolean,
    mintOrBurnMarkerModalShown: boolean,
    mintOrBurnMarker: ProvenanceMarker,
    mintOrBurnMode: MintOrBurnMode,
    withdrawMarkerModalShown: boolean,
    withdrawMarker: ProvenanceMarker
}

export default class ProvenanceMarkersView extends React.Component<ProvenanceMarkersViewProps, ProvenanceMarkersViewState> {

    constructor(props: any) {
        super(props);

        this.state = {
            markerDetails: undefined,
            addMarkerModalShown: false,
            mintOrBurnMarkerModalShown: false,
            mintOrBurnMarker: undefined,
            mintOrBurnMode: MintOrBurnMode.Mint,
            withdrawMarkerModalShown: false,
            withdrawMarker: undefined
        };
    }

    confirmDeleteDialog: Dialog;

    render() {
        const keys = this.props.accountKeys;
        const markers = this.props.markers;

        const isMarkerDetailsShown = () => {
            return (this.state.markerDetails != undefined);
        }

        const showMarkerDetails = (m) => {
            this.props.appBinding.getAccountBalances(m.base_account.address).then((balances) => {
                this.setState({
                    markerDetails: {
                        marker: m,
                        balances: balances
                    }
                });
            }).catch((err) => {
                Utils.showAlert(Alert.Danger, `Unable to retrieve marker details for base account ${m.base_account.address}`, err.message, true);
            });
        };

        const deleteMarker = (m) => {
            this.confirmDeleteDialog.show({
                title: 'Confirm delete marker',
                body: `Are you sure you want to delete the marker "${m.denom}"?`,
                bsSize: 'small',
                actions: [
                    Dialog.OKAction(() => {
                        // find account with delete permissions
                        const deleter = m.access_control.find((access) => {
                            return access.permissions.find((perm) => {
                                return perm == 'ACCESS_DELETE';
                            }) != undefined;
                        });

                        if(deleter != undefined) {
                            Utils.deleteMarker(m.denom, deleter.address).catch((err) => {
                                Utils.showAlert(Alert.Danger, `Unable to delete marker "${m.denom}"`, err.message, true);
                            });
                        } else {
                            Utils.showAlert(Alert.Danger, `Unable to delete marker`, `Failed to locate an account with ACCESS_DELETE privileges to delete the marker.`, true);
                        }
                    }),
                    Dialog.CancelAction()
                ]
            });
        };

        const mintMarkerCoins = (m) => {
            showMintOrBurnMarkerModal(m, MintOrBurnMode.Mint);
        };

        const burnMarkerCoins = (m) => {
            showMintOrBurnMarkerModal(m, MintOrBurnMode.Burn);
        };

        const withdrawMarkerCoins = (m) => {
            showWithdrawMarkerModal(m);
        };

        const goHome = () => {
            this.setState({
                markerDetails: undefined
            });
        };

        const showAddMarkerModal = () => {
            this.setState({
                addMarkerModalShown: true
            });
        };

        const hideAddMarkerModal = () => {
            this.setState({
                addMarkerModalShown: false
            });
        };

        const showMintOrBurnMarkerModal = (marker: ProvenanceMarker, mode: MintOrBurnMode) => {
            this.setState({
                mintOrBurnMarkerModalShown: true,
                mintOrBurnMarker: marker,
                mintOrBurnMode: mode
            });
        };

        const hideMintOrBurnMarkerModal = () => {
            this.setState({
                mintOrBurnMarkerModalShown: false
            });
        };

        const showWithdrawMarkerModal = (marker: ProvenanceMarker) => {
            this.setState({
                withdrawMarkerModalShown: true,
                withdrawMarker: marker
            });
        };

        const hideWithdrawMarkerModal = () => {
            this.setState({
                withdrawMarkerModalShown: false
            });
        };

        const renderAddMarkerTooltip = (props) => (
            <Tooltip id="button-tooltip" {...props}>New marker</Tooltip>
        );

        const renderMintMarkerTooltip = (props) => (
            <Tooltip id="mint-button-tooltip" {...props}>Mint</Tooltip>
        );

        const renderBurnMarkerTooltip = (props) => (
            <Tooltip id="burn-button-tooltip" {...props}>Burn</Tooltip>
        );

        const renderWithdrawMarkerTooltip = (props) => (
            <Tooltip id="withdraw-button-tooltip" {...props}>Withdraw</Tooltip>
        );

        const renderDeleteMarkerTooltip = (props) => (
            <Tooltip id="delete-button-tooltip" {...props}>Delete marker</Tooltip>
        );

        return (
            <React.Fragment>
                <Breadcrumb>
                    <Breadcrumb.Item href="#" onClick={() => goHome()} active={!isMarkerDetailsShown()}>Markers</Breadcrumb.Item>
                    { isMarkerDetailsShown() && <Breadcrumb.Item active={isMarkerDetailsShown()}>{this.state.markerDetails.marker.denom}</Breadcrumb.Item> }
                </Breadcrumb>
                { !isMarkerDetailsShown() &&
                    <Card className="tableCard">
                        <Card.Header>
                            <OverlayTrigger
                                placement="bottom"
                                delay={{ show: 250, hide: 400 }}
                                overlay={renderAddMarkerTooltip}
                            >
                                <Button 
                                    variant="primary" 
                                    size="sm" 
                                    className="float-right mr-1" 
                                    onClick={() => showAddMarkerModal()}
                                >
                                        <FaPlus />
                                </Button>
                            </OverlayTrigger>
                        </Card.Header>
                        <Card.Body>
                            <Table striped bordered hover responsive variant="dark" size="sm">
                                <thead>
                                    <tr>
                                        <th>Denom</th>
                                        <th>Base Account</th>
                                        <th>Status</th>
                                        <th>Supply</th>
                                        <th>Type</th>
                                        <th>&nbsp;</th>
                                    </tr>
                                </thead>
                                <tbody className="markerTableField noselect">
                                    {markers.map((marker, idx) =>
                                        <tr key={marker.denom}>
                                            <td><a href="#" onClick={() => showMarkerDetails(marker)}>{marker.denom}</a></td>
                                            <td>{marker.base_account.address}</td>
                                            <td>{marker.status.replace('MARKER_STATUS_', '')}</td>
                                            <td>{marker.supply} {marker.supply_fixed && <span>(fixed)</span>}</td>
                                            <td>{marker.marker_type.replace('MARKER_TYPE_', '')}</td>
                                            <td>
                                                {!marker.supply_fixed && <OverlayTrigger
                                                    placement="bottom"
                                                    delay={{ show: 250, hide: 400 }}
                                                    overlay={renderMintMarkerTooltip}
                                                >
                                                    <span className="markerAction"><a href="#" className="actions" onClick={() => mintMarkerCoins(marker)}><FaCoins /></a></span>
                                                </OverlayTrigger>}
                                                {!marker.supply_fixed && <OverlayTrigger
                                                    placement="bottom"
                                                    delay={{ show: 250, hide: 400 }}
                                                    overlay={renderBurnMarkerTooltip}
                                                >
                                                    <span className="markerAction"><a href="#" className="actions" onClick={() => burnMarkerCoins(marker)}><FaFireAlt /></a></span>
                                                </OverlayTrigger>}
                                                <OverlayTrigger
                                                    placement="bottom"
                                                    delay={{ show: 250, hide: 400 }}
                                                    overlay={renderWithdrawMarkerTooltip}
                                                >
                                                    <span className="markerAction"><a href="#" className="actions" onClick={() => withdrawMarkerCoins(marker)}><FaArrowCircleDown /></a></span>
                                                </OverlayTrigger>
                                                {marker.denom != "nhash" && <OverlayTrigger
                                                    placement="bottom"
                                                    delay={{ show: 250, hide: 400 }}
                                                    overlay={renderDeleteMarkerTooltip}
                                                >
                                                    <span className="markerAction"><a href="#" className="actions" onClick={() => deleteMarker(marker)}><FaTrashAlt /></a></span>
                                                </OverlayTrigger>}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                }
                { isMarkerDetailsShown() && <MarkerDetailsView accountKeys={keys} marker={this.state.markerDetails.marker} balances={this.state.markerDetails.balances}></MarkerDetailsView> }
                <AddMarkerModal
                    show={this.state.addMarkerModalShown}
                    keys={keys}
                    onCancel={() => hideAddMarkerModal()}
                    onMarkerCreated={(marker) => { 
                        hideAddMarkerModal();
                        Utils.showAlert(Alert.Success, `Created new marker "${marker.denom}"`, `Created new marker "${marker.denom}" of type "${marker.marker_type}" with supply of ${marker.supply}`, true);
                    }}
                    onError={(err) => {
                        Utils.showAlert(Alert.Danger, `Unable to create new marker`, err.message, true);
                    }}
                ></AddMarkerModal>
                <MintOrBurnMarkerModal
                    show={this.state.mintOrBurnMarkerModalShown}
                    keys={keys}
                    marker={this.state.mintOrBurnMarker}
                    mode={this.state.mintOrBurnMode}
                    onCancel={() => hideMintOrBurnMarkerModal()}
                    onMarkerMinted={(marker, total) => {
                        hideMintOrBurnMarkerModal();
                        Utils.showAlert(Alert.Success, `Successfully minted marker coins`, `Minted ${total} ${marker.denom} coins`, true);
                    }}
                    onMarkerBurned={(marker, total) => {
                        hideMintOrBurnMarkerModal();
                        Utils.showAlert(Alert.Success, `Successfully burned marker coins`, `Burned ${total} ${marker.denom} coins`, true);
                    }}
                    onError={(err) => {
                        Utils.showAlert(Alert.Danger, `Unable to ${(this.state.mintOrBurnMode == MintOrBurnMode.Mint) ? "mint" : "burn"} marker coin`, err.message, true);
                    }}
                ></MintOrBurnMarkerModal>
                <WithdrawMarkerModal
                    show={this.state.withdrawMarkerModalShown}
                    keys={keys}
                    marker={this.state.withdrawMarker}
                    onCancel={() => hideWithdrawMarkerModal()}
                    onMarkerWithdrawn={(marker, total, address) => {
                        hideWithdrawMarkerModal();
                        Utils.showAlert(Alert.Success, `Successfully withdrew marker coins`, `Withdrew ${total} ${marker.denom} coins to ${address}`, true);
                    }}
                    onError={(err) => {
                        Utils.showAlert(Alert.Danger, `Unable to withdraw marker coin`, err.message, true);
                    }}
                ></WithdrawMarkerModal>
                <Dialog ref={(el) => { this.confirmDeleteDialog = el }} />
            </React.Fragment>
        );
    }

}

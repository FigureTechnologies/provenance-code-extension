import * as React from "react";
import './provenance-markers-view.scss';
import { FaPlus, FaTrashAlt } from 'react-icons/fa';
import Dialog from 'react-bootstrap-dialog';

import { Breadcrumb, Button, Card, OverlayTrigger, Table, Tooltip } from 'react-bootstrap';
import { Alert, ChainViewAppBinding } from './app-binding';
import { ProvenanceKey } from './provenance-key';
import { ProvenanceMarker } from './provenance-marker';
import { Utils } from './app-utils';

import MarkerDetailsView from './marker-details-view';
import AddMarkerModal from './add-marker-modal';

interface ProvenanceMarkerDetails {
    marker: ProvenanceMarker
}

interface ProvenanceMarkersViewProps {
    appBinding: ChainViewAppBinding,
    accountKeys: ProvenanceKey[],
    markers: ProvenanceMarker[]
}

interface ProvenanceMarkersViewState {
    markerDetails: (ProvenanceMarkerDetails | undefined),
    addMarkerModalShown: boolean
}

export default class ProvenanceMarkersView extends React.Component<ProvenanceMarkersViewProps, ProvenanceMarkersViewState> {

    constructor(props: any) {
        super(props);

        this.state = {
            markerDetails: undefined,
            addMarkerModalShown: false
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
            this.setState({
                markerDetails: {
                    marker: m
                }
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

        const renderAddMarkerTooltip = (props) => (
            <Tooltip id="button-tooltip" {...props}>New marker</Tooltip>
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
                                            <td>{marker.status}</td>
                                            <td>{marker.supply} {marker.supply_fixed && <span>(fixed)</span>}</td>
                                            <td>{marker.marker_type}</td>
                                            <td>
                                                {marker.denom != "nhash" && <OverlayTrigger
                                                    placement="right"
                                                    delay={{ show: 250, hide: 400 }}
                                                    overlay={renderDeleteMarkerTooltip}
                                                >
                                                    <a href="#" className="actions" onClick={() => deleteMarker(marker)}><FaTrashAlt /></a>
                                                </OverlayTrigger>}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                }
                { isMarkerDetailsShown() && <MarkerDetailsView accountKeys={keys} marker={this.state.markerDetails.marker}></MarkerDetailsView> }
                <AddMarkerModal
                    show={this.state.addMarkerModalShown}
                    keys={keys}
                    onCancel={() => hideAddMarkerModal() }
                    onMarkerCreated={(marker) => { 
                        hideAddMarkerModal();
                        Utils.showAlert(Alert.Success, `Created new marker "${marker.denom}"`, `Created new marker "${marker.denom}" of type "${marker.marker_type}" with supply of ${marker.supply}`, true);
                    }}
                    onError={(err) => {
                        Utils.showAlert(Alert.Danger, `Unable to create new marker`, err.message, true);
                    }}
                ></AddMarkerModal>
                <Dialog ref={(el) => { this.confirmDeleteDialog = el }} />
            </React.Fragment>
        );
    }

}

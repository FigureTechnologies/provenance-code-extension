export interface ProvenanceMarkerBaseAccount {
	address: string,
	pub_key: string
}

export interface ProvenanceMarkerAccessControl {
	address: string,
	permissions: string[]
}

export interface ProvenanceMarker {
	base_account: ProvenanceMarkerBaseAccount,
	manager: string,
	access_control: ProvenanceMarkerAccessControl[],
	status: string,
	denom: string,
	supply: number,
	marker_type: string,
	supply_fixed: boolean,
	allow_governance_control: boolean
}

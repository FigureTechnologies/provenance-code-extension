import * as React from "react";
import './new-project-modal.scss';

import { Button, Col, Form, InputGroup, Modal, Row, Spinner } from 'react-bootstrap';
import { Utils } from './app-utils';

import { GitUserConfig } from "./git-user-config";
import { SmartContractTemplate } from './smart-contract-template';

interface FileExt extends File {
    path: string
}

interface ValidationInfo {
    isValid: boolean,
    isValidated: boolean,
    error: (string | undefined)
}

interface NewProjectModalProps {
    show: boolean,
    templates: SmartContractTemplate[],
    gitUserConfig: GitUserConfig,
    onCancel: (() => void),
    onProjectCreated: ((projectName: string, templateName: string) => void),
    onError: ((err: Error) => void)
}

interface NewProjectModalState {
    isBusy: boolean,
    formValid: boolean,
    formValidated: boolean,
    selectedTemplate: SmartContractTemplate,
    projectName: string,
    projectLocation: string,
    authorName: string,
    authorEmail: string,
    authorOrganization: string,
    sourceRepo: string,
    manualSourceRepo: boolean,
    projectNameValidation: ValidationInfo,
    projectLocationValidation: ValidationInfo,
    projectTemplateValidation: ValidationInfo,
    templateVersionValidation: ValidationInfo,
    authorValidation: ValidationInfo,
    emailAddressValidation: ValidationInfo,
    organizationValidation: ValidationInfo,
    sourceRepoValidation: ValidationInfo
}

export default class NewProjectModal extends React.Component<NewProjectModalProps, NewProjectModalState> {

    constructor(props: any) {
        super(props);

        this.state = {
            isBusy: false,
            formValid: false,
            formValidated: false,
            projectName: "",
            projectLocation: "",
            authorName: this.props.gitUserConfig.name,
            authorEmail: this.props.gitUserConfig.email,
            authorOrganization: '',
            sourceRepo: `git@github.com:${this.props.gitUserConfig.name}/project-name.git`,
            manualSourceRepo: false,
            selectedTemplate: this.props.templates[0],
            projectNameValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            },
            projectLocationValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            },
            projectTemplateValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            },
            templateVersionValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            },
            authorValidation: {
                isValid: true,
                isValidated: (this.props.gitUserConfig.name ? true : false),
                error: undefined
            },
            emailAddressValidation: {
                isValid: true,
                isValidated: (this.props.gitUserConfig.email ? true : false),
                error: undefined
            },
            organizationValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            },
            sourceRepoValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            }
        };

        this.createNewProject = this.createNewProject.bind(this);
    }

    _input_projectName;
    _input_projectLocation;
    _input_projectTemplate;
    _input_templateVersion;
    _input_author;
    _input_emailAddress;
    _input_organization;
    _input_sourceRepo;

    _input_directorySelector;

    componentDidMount(){
        this._input_directorySelector = this.buildDirectorySelector();
    }

    reset() {
        this.setState({
            isBusy: false,
            formValid: false,
            formValidated: false,
            projectName: "",
            projectLocation: "",
            authorName: this.props.gitUserConfig.name,
            authorEmail: this.props.gitUserConfig.email,
            authorOrganization: '',
            sourceRepo: `git@github.com:${this.props.gitUserConfig.name}/project-name.git`,
            manualSourceRepo: false,
            selectedTemplate: this.props.templates[0],
            projectNameValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            },
            projectLocationValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            },
            projectTemplateValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            },
            templateVersionValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            },
            authorValidation: {
                isValid: true,
                isValidated: (this.props.gitUserConfig.name ? true : false),
                error: undefined
            },
            emailAddressValidation: {
                isValid: true,
                isValidated: (this.props.gitUserConfig.email ? true : false),
                error: undefined
            },
            organizationValidation: {
                isValid: true,
                isValidated: false,
                error: undefined
            },
            sourceRepoValidation: {
                isValid: true,
                isValidated: true,
                error: undefined
            }
        });
    }

    render() {
        const templates = this.props.templates;

        const validateProjectName = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            if (value.includes(' ')) {
                validationInfo.isValid = false;
                validationInfo.error = "Project name cannot include spaces";
            } else if (value.length == 0) {
                validationInfo.isValid = false;
                validationInfo.error = "Project name required";
            }

            this.setState({
                formValid: validationInfo.isValid && this.state.projectLocationValidation.isValid && this.state.projectTemplateValidation.isValid && this.state.templateVersionValidation.isValid && 
                    this.state.authorValidation.isValid && this.state.emailAddressValidation.isValid && this.state.organizationValidation.isValid && this.state.sourceRepoValidation.isValid,
                formValidated: validationInfo.isValidated && this.state.projectLocationValidation.isValidated && this.state.projectTemplateValidation.isValidated && this.state.templateVersionValidation.isValidated && 
                    this.state.authorValidation.isValidated && this.state.emailAddressValidation.isValidated && this.state.organizationValidation.isValidated && this.state.sourceRepoValidation.isValidated,
                projectNameValidation: validationInfo
            });
        }

        const validateProjectLocation = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            if (value.length == 0) {
                validationInfo.isValid = false;
                validationInfo.error = "Project location required";
            }

            this.setState({
                formValid: this.state.projectNameValidation.isValid && validationInfo.isValid && this.state.projectTemplateValidation.isValid && this.state.templateVersionValidation.isValid && 
                    this.state.authorValidation.isValid && this.state.emailAddressValidation.isValid && this.state.organizationValidation.isValid && this.state.sourceRepoValidation.isValid,
                formValidated: this.state.projectNameValidation.isValidated && validationInfo.isValidated && this.state.projectTemplateValidation.isValidated && this.state.templateVersionValidation.isValidated && 
                    this.state.authorValidation.isValidated && this.state.emailAddressValidation.isValidated && this.state.organizationValidation.isValidated && this.state.sourceRepoValidation.isValidated,
                projectLocationValidation: validationInfo
            });
        }

        const validateProjectTemplate = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            if (!templates.find((template) => template.name == value)) {
                validationInfo.isValid = false;
                validationInfo.error = "Project template does not exist";
            }

            this.setState({
                formValid: this.state.projectNameValidation.isValid && this.state.projectLocationValidation.isValid && validationInfo.isValid && this.state.templateVersionValidation.isValid && 
                    this.state.authorValidation.isValid && this.state.emailAddressValidation.isValid && this.state.organizationValidation.isValid && this.state.sourceRepoValidation.isValid,
                formValidated: this.state.projectNameValidation.isValidated && this.state.projectLocationValidation.isValidated && validationInfo.isValidated && this.state.templateVersionValidation.isValidated && 
                    this.state.authorValidation.isValidated && this.state.emailAddressValidation.isValidated && this.state.organizationValidation.isValidated && this.state.sourceRepoValidation.isValidated,
                projectTemplateValidation: validationInfo
            });
        }

        const validateTemplateVersion = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            const template = templates.find((template) => template.name == value);
            if (!template) {
                validationInfo.isValid = false;
                validationInfo.error = "Project template does not exist";
            }
            else if (!template.versions.includes(value)) {
                validationInfo.isValid = false;
                validationInfo.error = "Invalid version for project template";
            }

            this.setState({
                formValid: this.state.projectNameValidation.isValid && this.state.projectLocationValidation.isValid && this.state.projectTemplateValidation.isValid && validationInfo.isValid && 
                    this.state.authorValidation.isValid && this.state.emailAddressValidation.isValid && this.state.organizationValidation.isValid && this.state.sourceRepoValidation.isValid,
                formValidated: this.state.projectNameValidation.isValidated && this.state.projectLocationValidation.isValidated && this.state.projectTemplateValidation.isValidated && validationInfo.isValidated && 
                    this.state.authorValidation.isValidated && this.state.emailAddressValidation.isValidated && this.state.organizationValidation.isValidated && this.state.sourceRepoValidation.isValidated,
                templateVersionValidation: validationInfo
            });
        }

        const validateAuthor = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            if (value.length == 0) {
                validationInfo.isValid = false;
                validationInfo.error = "Author required";
            }

            this.setState({
                formValid: this.state.projectNameValidation.isValid && this.state.projectLocationValidation.isValid && this.state.projectTemplateValidation.isValid && this.state.templateVersionValidation.isValid && 
                    validationInfo.isValid && this.state.emailAddressValidation.isValid && this.state.organizationValidation.isValid && this.state.sourceRepoValidation.isValid,
                formValidated: this.state.projectNameValidation.isValidated && this.state.projectLocationValidation.isValidated && this.state.projectTemplateValidation.isValidated && this.state.templateVersionValidation.isValidated && 
                    validationInfo.isValidated && this.state.emailAddressValidation.isValidated && this.state.organizationValidation.isValidated && this.state.sourceRepoValidation.isValidated,
                authorValidation: validationInfo
            });
        }

        const validateEmailAddress = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            if (value.length == 0) {
                validationInfo.isValid = false;
                validationInfo.error = "Email address required";
            } else if (!Utils.validateEmailAddress(value)) {
                validationInfo.isValid = false;
                validationInfo.error = "Invalid email address";
            }

            this.setState({
                formValid: this.state.projectNameValidation.isValid && this.state.projectLocationValidation.isValid && this.state.projectTemplateValidation.isValid && this.state.templateVersionValidation.isValid && 
                    this.state.authorValidation.isValid && validationInfo.isValid && this.state.organizationValidation.isValid && this.state.sourceRepoValidation.isValid,
                formValidated: this.state.projectNameValidation.isValidated && this.state.projectLocationValidation.isValidated && this.state.projectTemplateValidation.isValidated && this.state.templateVersionValidation.isValidated && 
                    this.state.authorValidation.isValidated && validationInfo.isValidated && this.state.organizationValidation.isValidated && this.state.sourceRepoValidation.isValidated,
                emailAddressValidation: validationInfo
            });
        }

        const validateOrganization = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            if (value.length == 0) {
                validationInfo.isValid = false;
                validationInfo.error = "Organization required";
            }

            this.setState({
                formValid: this.state.projectNameValidation.isValid && this.state.projectLocationValidation.isValid && this.state.projectTemplateValidation.isValid && this.state.templateVersionValidation.isValid && 
                    this.state.authorValidation.isValid && this.state.emailAddressValidation.isValid && validationInfo.isValid && this.state.sourceRepoValidation.isValid,
                formValidated: this.state.projectNameValidation.isValidated && this.state.projectLocationValidation.isValidated && this.state.projectTemplateValidation.isValidated && this.state.templateVersionValidation.isValidated && 
                    this.state.authorValidation.isValidated && this.state.emailAddressValidation.isValidated && validationInfo.isValidated && this.state.sourceRepoValidation.isValidated,
                organizationValidation: validationInfo
            });
        }

        const validateSourceRepo = (value) => {
            var validationInfo: ValidationInfo = {
                isValid: true,
                isValidated: true,
                error: undefined
            };

            if (value.length == 0) {
                validationInfo.isValid = false;
                validationInfo.error = "Source repo required";
            } else if (!Utils.validateUrl(value) && !Utils.validateGitUrl(value)) {
                validationInfo.isValid = false;
                validationInfo.error = "Invalid repo url";
            }

            this.setState({
                formValid: this.state.projectNameValidation.isValid && this.state.projectLocationValidation.isValid && this.state.projectTemplateValidation.isValid && this.state.templateVersionValidation.isValid && 
                    this.state.authorValidation.isValid && this.state.emailAddressValidation.isValid && this.state.organizationValidation.isValid && validationInfo.isValid,
                formValidated: this.state.projectNameValidation.isValidated && this.state.projectLocationValidation.isValidated && this.state.projectTemplateValidation.isValidated && this.state.templateVersionValidation.isValidated && 
                    this.state.authorValidation.isValidated && this.state.emailAddressValidation.isValidated && this.state.organizationValidation.isValidated && validationInfo.isValidated,
                sourceRepoValidation: validationInfo
            });
        }

        const setProjectName = (value) => {
            validateProjectName(value);
            this.setState({
                projectName: value,
                sourceRepo: determineSourceRepo(this.state.authorName, value)
            });
        }

        const setProjectLocation = (value) => {
            validateProjectLocation(value);
            this.setState({ projectLocation: value });
        }

        const setAuthor = (value) => {
            validateAuthor(value);
            this.setState({ 
                authorName: value,
                sourceRepo: determineSourceRepo(value, this.state.projectName)
            });
        }

        const setEmailAddress = (value) => {
            validateEmailAddress(value);
            this.setState({ authorEmail: value });
        }

        const setOrganization = (value) => {
            validateOrganization(value);
            this.setState({ authorOrganization: value });
        }

        const setSourceRepo = (value) => {
            validateSourceRepo(value);
            this.setState({
                sourceRepo: value,
                manualSourceRepo: true
            });
        }

        const selectProjectTemplate = (value) => {
            validateProjectTemplate(value);

            if (this.state.projectTemplateValidation.isValid) {
                this.setState({
                    selectedTemplate: templates.find((template) => template.name == value)
                });
            }
        }

        const determineSourceRepo = (userName: string, projectName: string) => {
            if (this.state.manualSourceRepo) {
                return this.state.sourceRepo;
            } else {
                if (!userName || userName.length == 0) {
                    userName = 'AuthorName';
                }

                if (!projectName || projectName.length == 0) {
                    projectName = 'project-name';
                }

                return `git@github.com:${userName.replace(" ", "")}/${projectName.replace(" ", "")}.git`;
            }
        }

        const browseProjectLocation = (e) => {
            e.preventDefault();
            this._input_directorySelector.click();
        }

        return (
            <React.Fragment>
                <Modal
                    {...this.props}
                    size="lg"
                    aria-labelledby="contained-modal-title-vcenter"
                    centered
                    onHide={() => { if (!this.state.isBusy) this.props.onCancel(); }}
                    onEnter={() => this.reset()}
                    className="newProjectModal"
                >
                    <Modal.Header closeButton={!this.state.isBusy}>
                        <Modal.Title id="contained-modal-title-vcenter">New Project</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group as={Row} controlId="name">
                                <Form.Label column sm={3}>Project name</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        type="text"
                                        placeholder="project-name"
                                        value={this.state.projectName}
                                        ref={(c) => this._input_projectName = c}
                                        onChange={e => setProjectName(e.currentTarget.value)}
                                        isInvalid={!this.state.projectNameValidation.isValid}
                                        disabled={this.state.isBusy}
                                    />
                                    <Form.Control.Feedback type="invalid">{this.state.projectNameValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="template">
                                <Form.Label column sm={3}>Project template</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        custom
                                        as="select"
                                        placeholder=""
                                        ref={(c) => this._input_projectTemplate = c}
                                        onChange={e => selectProjectTemplate(e.currentTarget.value)}
                                        isInvalid={!this.state.projectTemplateValidation.isValid}
                                        disabled={this.state.isBusy}
                                    >
                                        {templates.map((template, idx) =>
                                            <option value={template.name}>{template.name}</option>
                                        )}
                                    </Form.Control>
                                    <Form.Control.Feedback type="invalid">{this.state.projectTemplateValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                            {(this.state.selectedTemplate != undefined) && <Form.Group as={Row} controlId="version">
                                <Form.Label column sm={3}>Version</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        custom
                                        as="select"
                                        placeholder=""
                                        ref={(c) => this._input_templateVersion = c}
                                        onChange={e => validateTemplateVersion(e.currentTarget.value)}
                                        isInvalid={!this.state.templateVersionValidation.isValid}
                                        disabled={this.state.isBusy}
                                    >
                                        {this.state.selectedTemplate.versions.map((version, idx) =>
                                            <option value={version}>{version}</option>
                                        )}
                                    </Form.Control>
                                    <Form.Control.Feedback type="invalid">{this.state.templateVersionValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>}
                            <Form.Group as={Row} controlId="location">
                                <Form.Label column sm={3}>Location</Form.Label>
                                <Col sm={9}>
                                    <InputGroup className="mb-3">
                                        <Form.Control 
                                            type="text"
                                            placeholder=""
                                            value={this.state.projectLocation}
                                            ref={(c) => this._input_projectLocation = c}
                                            onChange={e => setProjectLocation(e.currentTarget.value)}
                                            isInvalid={!this.state.projectLocationValidation.isValid}
                                            disabled={this.state.isBusy}
                                        />
                                        <InputGroup.Append>
                                            <Button
                                                variant="outline-secondary"
                                                disabled={this.state.isBusy}
                                                onClick={browseProjectLocation}
                                            >
                                                Browse
                                            </Button>
                                        </InputGroup.Append>
                                        <Form.Control.Feedback type="invalid">{this.state.projectLocationValidation.error}</Form.Control.Feedback>
                                    </InputGroup>
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="author">
                                <Form.Label column sm={3}>Author name</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        type="text"
                                        placeholder=""
                                        value={this.state.authorName}
                                        ref={(c) => this._input_author = c}
                                        onChange={e => setAuthor(e.currentTarget.value)}
                                        isInvalid={!this.state.authorValidation.isValid}
                                        disabled={this.state.isBusy}
                                    />
                                    <Form.Control.Feedback type="invalid">{this.state.authorValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="email">
                                <Form.Label column sm={3}>Author email</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        type="text"
                                        placeholder=""
                                        value={this.state.authorEmail}
                                        ref={(c) => this._input_emailAddress = c}
                                        onChange={e => setEmailAddress(e.currentTarget.value)}
                                        isInvalid={!this.state.emailAddressValidation.isValid}
                                        disabled={this.state.isBusy}
                                    />
                                    <Form.Control.Feedback type="invalid">{this.state.emailAddressValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="org">
                                <Form.Label column sm={3}>Organization</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        type="text"
                                        placeholder=""
                                        value={this.state.authorOrganization}
                                        ref={(c) => this._input_organization = c}
                                        onChange={e => setOrganization(e.currentTarget.value)}
                                        isInvalid={!this.state.organizationValidation.isValid}
                                        disabled={this.state.isBusy}
                                    />
                                    <Form.Control.Feedback type="invalid">{this.state.organizationValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="repo">
                                <Form.Label column sm={3}>Source repo</Form.Label>
                                <Col sm={9}>
                                    <Form.Control 
                                        type="text"
                                        placeholder=""
                                        value={this.state.sourceRepo}
                                        ref={(c) => this._input_sourceRepo = c}
                                        onChange={e => setSourceRepo(e.currentTarget.value)}
                                        isInvalid={!this.state.sourceRepoValidation.isValid}
                                        disabled={this.state.isBusy}
                                    />
                                    <Form.Control.Feedback type="invalid">{this.state.sourceRepoValidation.error}</Form.Control.Feedback>
                                </Col>
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button 
                            variant="primary" 
                            onClick={this.createNewProject} 
                            disabled={this.state.isBusy || (!this.state.formValidated || !this.state.formValid)}
                        >
                            { this.state.isBusy ? <span><Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                /> Creating Project...</span>
                            : <span>Create Project</span>}
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={() => this.props.onCancel() } 
                            disabled={this.state.isBusy}
                        >
                            Cancel
                        </Button>
                    </Modal.Footer>
                </Modal>
            </React.Fragment>
        );
    }

    private createNewProject() {
        this.setState({ isBusy: true });

        const projectName = this.state.projectName;
        const projectLocation = this.state.projectLocation;
        const selectedTemplate = this.state.selectedTemplate.name;
        const templateVersion = this._input_templateVersion.value as string;
        const authorName = this.state.authorName;
        const authorEmail = this.state.authorEmail;
        const authorOrg = this.state.authorOrganization.replace(' ', '-').toLocaleLowerCase();
        const sourceRepo = this.state.sourceRepo;

        Utils.createNewProject(projectName, projectLocation, selectedTemplate, templateVersion, authorName, authorEmail, authorOrg, sourceRepo).then(() => {
            this.setState({ isBusy: false });
            this.props.onProjectCreated(projectName, selectedTemplate);
        }).catch((err) => {
            this.setState({ isBusy: false });
            this.props.onError(err);
        });
    }

    private setProjectLocation(location: string) {
        this.setState({ projectLocation: location });
    }

    private buildDirectorySelector() {
        const dirSelector = document.createElement('input');
        dirSelector.setAttribute('type', 'file');
        dirSelector.setAttribute('webkitdirectory', 'webkitdirectory');
        dirSelector.setAttribute('directory', 'directory');
        dirSelector.onchange = (e) => {
            var file: FileExt = (e.target as HTMLInputElement).files[0] as FileExt;
            var filename = file.name;
            var dir = file.path;

            if (dir.endsWith(filename)) {
                dir = dir.slice(0, dir.length - filename.length);
            }

            if (dir.endsWith('/') || dir.endsWith('\\')) {
                dir = dir.slice(0, dir.length - 1);
            }

            this.setProjectLocation(dir);
        }
        return dirSelector;
    }

}

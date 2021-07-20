export interface TemplateConfig {
    name: string,
    description: string,
    dir: string,
    repo: string,
}

export class Config {
    static readonly Templates: TemplateConfig[] = [
        {
            name: "Empty Smart Contract",
            description: "An empty smart contract that provides a basic starting point.",
            dir: "empty-smart-contract-template",
            repo: "git@github.com:FigureTechnologies/empty-smart-contract-template.git"
        }
    ];
}

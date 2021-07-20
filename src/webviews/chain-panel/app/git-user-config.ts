export interface GitUserConfig {
    name: string,
    email: string
}

export const EmptyGitUserConfig: GitUserConfig = {
    name: '',
    email: ''
};

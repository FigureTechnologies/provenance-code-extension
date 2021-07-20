import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

const TemplateCacheName = `provenance.template_cache`;
export interface TemplateCacheState {
    path: string,
}
const DefaultTemplateCacheData: TemplateCacheState = {
    path: path.join(os.homedir(), '.provenance-vscode-ext', 'templates')
};

const RecentProjectsName = `provenance.recent_projects`;
export interface RecentProjectsState {
    projectLocations: string[]
}
const DefaultRecentProjectsData: RecentProjectsState = {
    projectLocations: []
};

export class GlobalState {

    private static state: GlobalState;

    private context: vscode.ExtensionContext;

    public templateCache: TemplateCacheState;
    public recentProjects: RecentProjectsState;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        GlobalState.state = this;

        this.templateCache = context.globalState.get<TemplateCacheState>(TemplateCacheName, DefaultTemplateCacheData);
        this.recentProjects = context.globalState.get<RecentProjectsState>(RecentProjectsName, DefaultRecentProjectsData);
    }

    public static get(): GlobalState {
        return GlobalState.state;
    }
    
    public save() {
        this.context.globalState.update(TemplateCacheName, this.templateCache);
        this.context.globalState.update(RecentProjectsName, this.recentProjects);
    }

    public reset() {
        this.context.globalState.update(TemplateCacheName, DefaultTemplateCacheData);
        this.context.globalState.update(RecentProjectsName, DefaultRecentProjectsData);
    }
}

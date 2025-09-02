export type WorkspaceType = 'personal' | 'business' | 'team';

export interface WorkspaceTypeOption {
  type: WorkspaceType;
  label: string;
  caption: string;
  defaultName: string;
}

export const WORKSPACE_TYPE_OPTIONS: WorkspaceTypeOption[] = [
  {
    type: 'personal',
    label: 'Personal',
    caption: 'For individual trading. Single seat. Fast start.',
    defaultName: 'My Trading Workspace'
  },
  {
    type: 'business',
    label: 'Business',
    caption: 'For small firms. Invite teammates. Compliance light.',
    defaultName: 'Company Trading'
  },
  {
    type: 'team',
    label: 'Team',
    caption: 'For larger groups. Roles, advanced compliance.',
    defaultName: 'Team Trading'
  }
];

export interface CreateWorkspacePayload {
  p_name: string;
  p_wtype: WorkspaceType;
}
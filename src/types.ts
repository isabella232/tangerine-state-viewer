
export type StateType = 'actions' | 'reducers' | 'selectors' | 'unknown';

export interface JumpDefinition {
    name: string;
    file: string;
    line: number;
    type: StateType;
    context: string | undefined;
}

export interface Entry {
    name: string;
    children?: Entry[];
    jump?: JumpDefinition;
}
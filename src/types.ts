import { JumpDefinition } from "./state-parser";

export interface Entry {
    name: string;
    children?: Entry[];
    jump?: JumpDefinition;
}
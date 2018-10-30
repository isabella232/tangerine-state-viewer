import * as fs from 'fs';
import * as readLine from 'readline';
import * as walk from 'walk';
import {Entry} from './types';
import { resolve } from 'path';

export const Types = {
    actions: 'actions',
    reducers: 'reducers',
    selectors: 'selectors',
    unknown: 'unknown'
};

export type StateType = 'actions' | 'reducers' | 'selectors' | 'unknown';

export interface JumpDefinition {
    name: string;
    file: string;
    line: number;
    type: StateType;
    context: string | undefined;
}

export class StateParser {
    private appPath: string | void;
    private parsePromise: Promise<JumpDefinition[]>;

    constructor(path: string | void) {
        this.appPath = path;
        if(path) {
            this.parsePromise = this.parse(`${path}/state`, this.getExportedFunctions);
        } else {
            this.parsePromise = Promise.reject();
        }
        
    }

    async parse(stateDir: string, parser: (file: string) => Promise<JumpDefinition[]>): Promise<JumpDefinition[]> {
        return new Promise<JumpDefinition[]>((resolve, reject) => {
            if(stateDir) {
                fs.readdir(stateDir, async (err, items) => {
                    resolve(await this.parseDirectory(`${stateDir}`, parser));
                });
            } else {
                resolve([]);
            }
            
        });
    }

    async parseDirectory(dir: string, parser: (file: string) => Promise<JumpDefinition[]>, type?: string): Promise<JumpDefinition[]> {
        return new Promise<JumpDefinition[]>((resolve, reject) => {
            const ret: JumpDefinition[] = [];
            const walker = walk.walk(dir);
            
            walker.on('file', async (root, fileStats, next) => {
                console.log(root);
                
                if(type) {
                    if(fileStats.name === `${type}.js`) {
                        ret.push(...await parser(`${root}/${fileStats.name}`));
                    }
                } else {
                    ret.push(...await parser(`${root}/${fileStats.name}`));
                }
                
                next();
            });
            
            walker.on('end', () => {
                resolve(ret);
            });
        });
    }
        
    getExportedFunctions(file: string): Promise<JumpDefinition[]> {
        let lineNum = 0;
        let ret: JumpDefinition[] = [];

        return new Promise((resolve, reject) => {
            readLine.createInterface({
                input: fs.createReadStream(file)
            }).on('line', line => {
                let splitFilename = file.split('/')
                splitFilename = splitFilename.slice(splitFilename.indexOf('state')+1);
                console.log(splitFilename);

                // try and guess context/type based on structure/name
                let context = splitFilename.length > 1 ? splitFilename.slice(1, splitFilename.length-1).join('.') : undefined;
                let type: StateType = 'unknown';
                switch(splitFilename[0]) {
                    case 'selectors':
                    case 'selectors.js':
                    type = 'selectors';
                    break;

                    case 'reducers':
                    case 'reducers.js':
                    type = 'reducers';
                    break;

                    case 'actions':
                    case 'actions.js':
                    type = 'actions';
                    break;
                }

                const match = line.match(/export const ([a-z][A-Za-z]+)/gm);
                if(match && match.length === 1) {
                    const name = match[0].split(/[ ,]+/)[2];
                    console.log(`Found function with name: ${name}`);
                    ret.push({
                        name,
                        file: file,
                        line: lineNum,
                        type,
                        context,
                    });
                }
                lineNum = lineNum + 1;
            }).on('close', () => {
                console.log(ret);
                resolve(ret);
            });
        });
    }

    // get the actions as a nested entry thing
    async getFunctionsForType(type: string): Promise<Entry> {
        if(!this.appPath) {
            return {name: type[0].toUpperCase() + type.substr(1)};
        }

        const jumps: JumpDefinition[] = await this.parsePromise;
        const entries: {[context: string]: Entry[]} = {unknown: []};
        

        jumps.filter(j => j.type === type).forEach((jump) => {
            if(!jump.context) {
                entries.unknown.push({name: jump.name, jump});
            } else if(entries[jump.context]) {
                entries[jump.context].push({name: jump.name, jump});
            } else {
                entries[jump.context] = [{name: jump.name, jump}];
            }
        });
        console.log(entries);

        const entriesWithContext: Entry[] = Object.keys(entries).filter(c => c !== 'unknown').map(name => {
            const children = entries[name];
            return {
                name,
                children
            };
        });

        console.log(entriesWithContext);
        
        return {
            name: type[0].toUpperCase() + type.substr(1),
            children: [...entries.unknown, ...entriesWithContext]
        };
    }
}
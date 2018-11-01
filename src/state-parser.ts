import * as fs from 'fs';
import * as readLine from 'readline';
import * as walk from 'walk';
import {Entry, JumpDefinition, StateType} from './types';

export const Types = {
    actions: 'actions',
    reducers: 'reducers',
    selectors: 'selectors',
    unknown: 'unknown'
};

export class StateParser {
    private appPath: string | void;
    public parsePromise: Promise<JumpDefinition[]>;

    constructor(path: string | void) {
        this.appPath = path;
        if(path) {
            this.parsePromise = this.parse(`${path}/state`, this.getExportedFunctions);
        } else {
            this.parsePromise = Promise.reject();
        }
        
    }

    async parse(stateDir: string, parser: (file: string) => Promise<JumpDefinition[]>): Promise<JumpDefinition[]> {
        return new Promise<JumpDefinition[]>(async (resolve, reject) => {
            const ret: JumpDefinition[] = [];
            const walker = walk.walk(stateDir);

            walker.on('file', async (root, fileStats, next) => {
                ret.push(...await parser(`${root}/${fileStats.name}`));
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

        console.log(`Parsing: ${file}`);

        return new Promise((resolve, reject) => {
            readLine.createInterface({
                input: fs.createReadStream(file)
            }).on('line', line => {
                const match = line.match(/export const ([a-z][A-Za-z]+)/gm);
                if(match && match.length === 1) {
                    let splitFilename = file.split('/')
                    let filename = splitFilename[splitFilename.length-1];
                    splitFilename = splitFilename.slice(splitFilename.indexOf('state')+1);

                    // try and guess context/type based on structure/name
                    let context = splitFilename.length > 1 ? splitFilename.slice(1, splitFilename.length-1).join('.') : undefined;
                    
                    let type: StateType = 'unknown';

                    if(splitFilename[0].startsWith('selector') || filename.startsWith('selector')) {
                        type = "selectors";
                    } else if(splitFilename[0].startsWith('reducer') || filename.startsWith('reducer')) {
                        type = "reducers";
                    } else if(splitFilename[0].startsWith('action') || filename.startsWith('action')) {
                        type = "actions";
                    }

                    const name = match[0].split(/[ ,]+/)[2];
                    console.log(`Found function with name: ${name}, likely type: ${type}`);
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
                resolve(ret);
            });
        });
    }

    // get the actions as a nested entry thing
    async getFunctionsForType(type: string, search?: (entry: JumpDefinition[]) => JumpDefinition[]): Promise<Entry> {
        if(!this.appPath) {
            return {name: type[0].toUpperCase() + type.substr(1)};
        }

        const jumps: JumpDefinition[] = search ? search(await this.parsePromise) : await this.parsePromise;
        const entries: {[context: string]: Entry[]} = {unknown: []};
        
        // groupify the entries so we can show them in the treeview nicely
        jumps.filter(j => j.type === type).forEach((jump) => {
            if(!jump.context) {
                entries.unknown.push({name: jump.name, jump});
            } else if(entries[jump.context]) {
                entries[jump.context].push({name: jump.name, jump});
            } else {
                entries[jump.context] = [{name: jump.name, jump}];
            }
        });

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
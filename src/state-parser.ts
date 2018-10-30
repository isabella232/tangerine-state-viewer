import * as fs from 'fs';
import * as readLine from 'readline';
import * as walk from 'walk';
import {Entry} from './types';
import { resolve } from 'path';

export interface JumpDefinition {
    name: string;
    file: string;
    line: number;
}

export class StateParser {
    private appPath: string | void;

    constructor(path: string | void) {
        this.appPath = path;
    }

    async parse(type: string, stateDir: string, parser: (file: string) => Promise<JumpDefinition[]>): Promise<JumpDefinition[]> {
        return new Promise<JumpDefinition[]>((resolve, reject) => {
            if(stateDir) {
                fs.readdir(stateDir, async (err, items) => {
                    if(items.indexOf(type) > -1) {
                        resolve(await this.parseDirectory(`${stateDir}/${type}`, parser));
                    } 
                    resolve(await this.parseDirectory(`${stateDir}`, parser, type));
                });
            } else {
                resolve([]);
            }
            
        });
    }

    async parseDirectory(dir: string, parser: (file: string) => Promise<JumpDefinition[]>, type?: string): Promise<JumpDefinition[]> {
        return new Promise<JumpDefinition[]>((resolve, reject) => {
            const ret: JumpDefinition[] = [];
            const walker = walk.walk(dir)
            
            walker.on('file', async (root, fileStats, next) => {
                console.log(root)
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
                const match = line.match(/export const ([a-z][A-Za-z]+)/gm);
                if(match && match.length === 1) {
                    const name = match[0].split(/[ ,]+/)[2];
                    console.log(`Found function with name: ${name}`);
                    ret.push({
                        name,
                        file: file,
                        line: lineNum,
                    });
                }
                lineNum = lineNum + 1;
            }).on('close', () => {
                resolve(ret);
            });
        });
    }

    // get the actions as a nested entry thing
    async getFunctionsForType(type: string): Promise<Entry> {
        if(!this.appPath) {
            return {name: type[0].toUpperCase() + type.substr(1)};
        }

        const functions = await this.parse(type, `${this.appPath}/state`, this.getExportedFunctions);
        console.log(functions);
        return {
            name: type[0].toUpperCase() + type.substr(1),
            children: functions.map((action: JumpDefinition): Entry => ({
                name: action.name,
                jump: action,
            }))
        };
    }
}
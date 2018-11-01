'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {StateProvider} from './tree';
import { actionGenerator } from './generators';
import { Entry, JumpDefinition } from './types';
import * as Fuse from 'fuse.js';
import * as mkdirp from 'mkdirp';
import { fstat, writeFile, existsSync, appendFile } from 'fs';


function insertText(text: string) {
    var editor = vscode.window.activeTextEditor;

    if(editor) {
        editor.edit(
            edit => {
                if(editor) {
                    editor.selections.forEach(
                        selection => {
                            edit.delete(selection);
                            edit.insert(selection.start, text);
                        }
                    );
                }
            }
        );
    }
}

function defineCommands(context: vscode.ExtensionContext) {
    let createActionDisposable = vscode.commands.registerTextEditorCommand("tangerine.createAction", () => 
    vscode.window.showInputBox({
        placeHolder: "Enter name for new action with context e.g: \'ui.page.setLoading\'",
    }).then((name: string | undefined) => {
        if(!name || !vscode.window.activeTextEditor) {
            return Promise.reject();
        }
        
        const input = name.split('.');
        let context = input.slice(0, input.length-1).join('.');
        const actionName = input[input.length-1];
        
        const splitfile = vscode.window.activeTextEditor.document.fileName.split('/');
        if(context == '' && vscode.window.activeTextEditor && vscode.window.activeTextEditor) {

            // no context given, insert at point
            if(splitfile.indexOf('state')+2 > splitfile.length) {
                return;
            }
            context = splitfile.slice(splitfile.indexOf('state')+2, splitfile.length-1).join('.');
            insertText(actionGenerator(context, actionName));
        } else {
            const actionDef = actionGenerator(context, actionName);
            // create the context folder
            const actiondir = splitfile.slice(0, splitfile.indexOf('state')+1).join('/') + '/actions/' + context.replace('.','/');
            
            mkdirp(actiondir, (err) => {
                const filename = actiondir+'/index.js';
                if(!err) {
                    if(existsSync(actiondir)) {
                        appendFile(filename, actionDef, () => {});
                    } else {
                        writeFile(filename, "//@flow"+actionDef, ()=>{});
                    }
                    
                }
            });
        }
    }));
    context.subscriptions.push(createActionDisposable);
}

function jumpTo(jump: JumpDefinition) {
    vscode.workspace.openTextDocument(`${jump.file}`).then(document => {
        vscode.window.showTextDocument(document).then(editor => {
            const position = new vscode.Position(jump.line, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenter);
            vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
        });
    });
}

function searchJumps(jumps: JumpDefinition[], name: string, threshold = 0.3): JumpDefinition[] {
    const options: Fuse.FuseOptions<JumpDefinition> = {
        shouldSort: true,
        threshold,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: [
            'name',
            'context',
            'type'
        ]
    };
    const fuse = new Fuse(jumps, options);
    return fuse.search(name);
}

function setupTreeView(context: vscode.ExtensionContext) {
    let stateTreeProvider = new StateProvider();
    let stateTreeView = vscode.window.createTreeView('state-tree-view', { treeDataProvider: stateTreeProvider });
    
    stateTreeView.onDidChangeSelection((e: vscode.TreeViewSelectionChangeEvent<Entry>) => {
        const jump = e.selection[0].jump;
        if(jump) {
            jumpTo(jump);
        }
    });

    vscode.commands.registerCommand('tangerine.search', () => 
        vscode.window.showInputBox({placeHolder: 'Tangerine item to search for'})
        .then((name?: string) => {
            if(name) {
                stateTreeProvider.setIsInFilteringMode(false);
                vscode.commands.executeCommand('setContext', 'tangerine-state-filtering', true);
                vscode.commands.executeCommand('workbench.view.extension.state-tree-explorer');
                stateTreeProvider.onUpdateEditor((jumps) => searchJumps(jumps, name));
                stateTreeProvider.setIsInFilteringMode(true);
            }
        }
    ));

    vscode.commands.registerCommand('tangerine.jumpTo', async () => {
        const searchAndJump = async (name?: string) => {
            if(!name) return;

            const jumps = await stateTreeProvider.getRawJumps();
            const matches: JumpDefinition[] = searchJumps(jumps, name, 0.6);
            
            // we have a really close match, jump to the first one.
            if(matches[0]) {
                jumpTo(matches[0]);
            } else {
                vscode.window.showInformationMessage("No element with matching name found!");
            }
        }

        const editor = vscode.window.activeTextEditor;
        if(!editor) return;

        const selectedText = editor.document.getText(editor.selection)
        if(selectedText.length === 0) {
            vscode.window.showInputBox({placeHolder: 'Tangerine item to jump to'}).then((name?: string) => {
                searchAndJump(name);
            })
        } else {
            searchAndJump(selectedText);
        }
    });

    vscode.commands.registerCommand('tangerine.clearFilter', () => {
        vscode.commands.executeCommand('setContext', 'tangerine-state-filtering', false);
        stateTreeProvider.setIsInFilteringMode(false);
        stateTreeProvider.onUpdateEditor();
    });
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    defineCommands(context);
    setupTreeView(context);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
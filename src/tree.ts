import * as vscode from 'vscode';

interface Entry {

}

export class StateProvider implements vscode.TreeDataProvider<Entry> {
    // TODO scan for state
    async getChildren(element?: Entry): Promise<Entry[]> {
        console.log(element);
        return ["Test 1", "Test 2"];
    }

    getTreeItem(element: Entry): vscode.TreeItem {
        console.log(element);
        return new vscode.TreeItem("test");
    }
}
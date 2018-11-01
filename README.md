# tangerine-state-editor README

This is an extension to help out with state management in the "Tangerine" app structure proposed by Atlassian frontend. It provides some handy UI and commands to easily navigate to a specific selector in the current app.

Note that this is an innovation week project, future support is not guaranteed.

## Features

- State tree view
    - This extension provides a tree view of all **actions**, **selectors** and **reducers**.
    - Clicking on an item jumps to the line it is defined on
    \!\[Treeview\]\(images/treeview.png\)

- Fuzzy search
    - Fuzzy search your state! You don't need to type anything exactly when filtering or jumping to an item.
    - Click the handy filtering button on the treeview to filter the current apps state. (Or execute `tangerine.search`)
        - This filtering state will be cleared when you switch apps, click the 'clear filter' button, or execute `tangerine.clearFiltering`
    - You can also forego the search entirely if you know what you want. (via `tangerine.jumpTo`)
        - This will search the selected text and jump to the first match. (Does not need to be exact)
        - If no text is selected it will prompt for an item to jump to.
        
- Quick action creation
    - Quickly create an action in a subfolder! No need to right click and create a million folders anymore, just one command and one string.
    - Prepend your name with your context with a period delimited name e.g: `this.is.a.testAction` to create an action named `testAction` in `state/this/is/a/index.js`
    - If there is no context we will insert the action at the current cursor.
\!\[Action create\]\(images/actioncreate.png\)

## Requirements

This requires that your app has a **state** folder somewhere and that you vaguely follow the tangerine spec. If you're at Atlassian you already have 5000 eslint rules for that, so don't worry.

## Known Issues
- Action creator will not export types or respect a singular `actions.js` file.
- No options, who needs them?

## Release Notes

### 0.0.1

Initial release (2/11/18)
- Innovation week project because tangerine is hard to conceptualize, especially if you're new to an app
- Code quality: somewhere between spaghetti and shipit

- Implements commands:
    - `tangerine.createAction` -> Create an action




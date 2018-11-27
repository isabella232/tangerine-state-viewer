export function actionGenerator(context: string, name: string): string {
    const typeName = name.split(/(?=[A-Z])/).map(a => a.toUpperCase()).join('_');
    const allcaps = name.split(/(?=[A-Z])/).map(a => a.toUpperCase()).join(' ');
    const camelCase = name.replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => index === 0 ? letter.toLowerCase() : letter.toUpperCase()).replace(/\s+/g, '');
    const upperCamelCase = name.replace(/(?:^\w|[A-Z]|\b\w)/g, letter => letter.toUpperCase()).replace(/\s+/g, '');
    
    return `
// ${allcaps}
export const ${typeName}: 'state.actions.${context}.${typeName}' = 'state.actions.${context}.${typeName}';

export type ${upperCamelCase} = {|
    type: typeof ${typeName},
    payload: void,
|};

export const ${camelCase} = (
    payload: ${upperCamelCase}
): ${upperCamelCase} => ({
    type: ${typeName},
    payload,
});
`;
}
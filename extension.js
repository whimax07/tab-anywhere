const vscode = require('vscode');

function lineRequiresNextIndent(lineStr) {
    let code;
    let i = lineStr.length-1;
    for (; i >= 0; i--) {
        code = lineStr.charCodeAt(i);
        if (code !== 32 && code !== 9 && code !== 13 || code !== 10) {
            break;
        }
    }
    if (i < 0) {
        return false;
    }
    return (code === 40)  || // (
           (code === 91)  || // [
           (code === 123) || // {
           (code === 58);    // :
}
exports.activate = function() {
    vscode.commands.registerCommand('tab', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        let sel = editor.selection.active;
        let cursorLine = sel.line;
        let doc = editor.document;

        let prevLine;
        for (let i = cursorLine-1; i >= 0; i--) {
            let l = doc.lineAt(i);
            if (l.isEmptyOrWhitespace) {
                continue;
            }
            prevLine = l;
            break;
        }
        if (!prevLine) {
            vscode.commands.executeCommand('editor.action.indentLines');
            return;
        }
        let prevIndent = prevLine.firstNonWhitespaceCharacterIndex;
        let currIndent = doc.lineAt(cursorLine).firstNonWhitespaceCharacterIndex;
        let target = (lineRequiresNextIndent(prevLine.text))
            ? prevIndent + editor.options.indentSize
            : prevIndent;
        let diff = (currIndent - target);
        if (diff === 0) {
            return;
        }
        else if (diff > 0) {
            editor.edit(function(builder) {
                builder.delete(new vscode.Range(cursorLine, 0, cursorLine, diff));
            });
        } else { // diff is negative - under-indented
            editor.edit(function(builder) {
                builder.insert(new vscode.Position(cursorLine, 0), ' '.repeat(-diff));
            });
        }
    });
}


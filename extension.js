const vscode = require('vscode');

function lineRequiresNextIndent(line) {
    var lineStr = line.text;
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
function lineRequiresUnindent(line) {
    if (line.isEmptyOrWhitespace) {
        return false;
    }
    let startChar = line.text.charCodeAt(line.firstNonWhitespaceCharacterIndex);
    return ((startChar === 41) || // )
            (startChar === 93) || // ]
            (startChar === 125)); // }
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
            return;
        }
        let prevIndent = prevLine.firstNonWhitespaceCharacterIndex;
        let currLine = doc.lineAt(cursorLine);
        let currIndent = currLine.firstNonWhitespaceCharacterIndex;
        let target;
        if (lineRequiresUnindent(currLine)) {
            if (lineRequiresNextIndent(prevLine)) {
                target = prevIndent;
            } else {
                target = prevIndent - editor.options.indentSize;
                if (target < 0) {
                    target = 0;
                }
            }
        }
        else if (lineRequiresNextIndent(prevLine)) {
            target = prevIndent + editor.options.indentSize;
        }
        else {
            target = prevIndent;
        }

        let diff = (currIndent - target);
        if (diff === 0) {
            return; // no change
        }
        else if (diff > 0) {
            // overindented - delete some spaces
            editor.edit(function(builder) {
                builder.delete(new vscode.Range(cursorLine, 0, cursorLine, diff));
            });
        } else { // under-indented - add some spaces
            editor.edit(function(builder) {
                builder.insert(new vscode.Position(cursorLine, 0), ' '.repeat(-diff));
            });
        }
    });
}


const vscode = require('vscode');
const nextIndentPattern = /.*[\{\[\(\:]\s*(\/\/.*|\/\*.*\*\/\s*|#.*|)$/gm;
const nextIndentPattern_makefile = /.*[\{\[\(\:]/gm;

function lineRequiresNextIndent(line, doc) {
    var lineStr = line.text;
    var matches = lineStr.match((doc.languageId === "makefile")
        ? nextIndentPattern_makefile
        : nextIndentPattern
    );
    return matches;

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

function leadWsCount(line, tabSize) {
    let result = 0;
    let text = line.text;
    for (let i = line.firstNonWhitespaceCharacterIndex - 1; i >= 0; i--) {
        let code = text.charCodeAt(i);
        if (code === 9) {
            result += tabSize;
        } else {
            result++;
        }
    }
    return result;
}

exports.activate = function() {
    vscode.commands.registerCommand('tab', () => {
    try {
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
            var txt = l.text;
            let char1 = txt.charCodeAt(l.firstNonWhitespaceCharacterIndex);
            let char2 = txt.charCodeAt(l.firstNonWhitespaceCharacterIndex + 1);
            if ((char1 === 47) && (char2 === 47 || char2 === 42)) { // '//' and '/*'
                continue;
            } else if (char1 === 35) { // #
                continue;
            }
            prevLine = l;
            break;
        }
        if (!prevLine) {
            return;
        }
        let currLine = doc.lineAt(cursorLine);

        let options = editor.options;
        let indentSize = options.indentSize;
        let tabSize = options.tabSize;
        let insertSpaces = options.insertSpaces;

        let currIndent;
        let prevIndent;
        let indentStep;

        if (insertSpaces) {
            currIndent = currLine.firstNonWhitespaceCharacterIndex;
            prevIndent = prevLine.firstNonWhitespaceCharacterIndex;
            indentStep = indentSize;
        }
        else {
            currIndent = leadWsCount(currLine, tabSize);
            prevIndent = leadWsCount(prevLine, tabSize);
            indentStep = tabSize;
        }

        let target;
        if (lineRequiresUnindent(currLine, doc)) {
            if (lineRequiresNextIndent(prevLine, doc)) {
                target = prevIndent;
            } else {
                target = prevIndent - indentStep;
                if (target < 0) {
                    target = 0;
                }
            }
        }
        else if (lineRequiresNextIndent(prevLine, doc)) {
            target = prevIndent + indentStep;
        }
        else {
            target = prevIndent;
        }

        let diff = (currIndent - target); // diff is always in single spaces
        if (diff === 0 && insertSpaces) {
            return; // no change
        }
        if (!insertSpaces) { // we operate with tabs
            // diff can be zero here, but we may need to replace spaces with tabs and still have a diff
            let txt = currLine.text;
            let end = currLine.firstNonWhitespaceCharacterIndex;
            for (let i = 0; i < end; i++) {
                if (txt.charCodeAt(i) !== 9) {
                    // we work with tabs, but have spaces as well, so delete the whole whitespace from
                    // start of line and replace it with the calculated number of tabs
                    editor.edit(function(builder) {
                        builder.replace(new vscode.Range(cursorLine, 0, cursorLine, end), '\t'.repeat(Math.floor(target/tabSize)));
                    });
                    return;
                }
            }
            if (diff === 0) {
                return;
            }
            else if (diff < 0) {
                diff = Math.ceil(diff / tabSize);
            }
            else {
                diff = Math.floor(diff / tabSize);
            }
        }

        // business as usual
        if (diff > 0) {
            // overindented - delete some spaces
            editor.edit(function(builder) {
                builder.delete(new vscode.Range(cursorLine, 0, cursorLine, diff));
            });
        }
        else {
            // under-indented - add some spaces
            diff = -diff;
            editor.edit(function(builder) {
                builder.insert(new vscode.Position(cursorLine, 0), (insertSpaces ? ' ': '\t').repeat(diff));
            });
        }
    } catch(e) {
        console.error("Exception:", e);
    }
    });
}


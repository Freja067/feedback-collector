import * as vscode from 'vscode';
import * as duckdb from 'duckdb';

export function activate(context: vscode.ExtensionContext) {
    console.log('Feedback collector extension is now active!');

    // Initialize DuckDB
    const db = new duckdb.Database('feedback-collector.db'); // Creates or opens a database file
    const connection = db.connect();

    // Create a table for logs
    connection.run(`
        CREATE TABLE IF NOT EXISTS logs (
            timestamp TIMESTAMP,
            type TEXT,
            message TEXT
        )
    `);

    // Helper function to log to DuckDB
    const logToDatabase = (type: string, message: string) => {
        const timestamp = new Date().toISOString();
        connection.run(`
            INSERT INTO logs (timestamp, type, message)
            VALUES (?, ?, ?)
        `, [timestamp, type, message], (err) => {
            if (err) {
                console.error('Error inserting log into database:', err);
            }
        });
    };

    // Capture terminal open events
    vscode.window.onDidOpenTerminal((terminal) => {
        const message = `Terminal opened: ${terminal.name}`;
        console.log(message);
        logToDatabase('Terminal', message);

        terminal.sendText('echo "Terminal opened: " && echo Hello from feedback-collector!');
        terminal.processId.then((pid) => {
            const pidMessage = `Terminal with PID: ${pid} is open`;
            console.log(pidMessage);
            logToDatabase('Terminal', pidMessage);
        });
    });

    // Capture task start and end
    vscode.tasks.onDidStartTask((e) => {
        const message = `Task started: ${e.execution.task.name}`;
        console.log(message);
        logToDatabase('Task', message);
    });

    vscode.tasks.onDidEndTaskProcess((e) => {
        const message = e.exitCode !== undefined
            ? `Task finished with exit code: ${e.exitCode}`
            : 'Task finished without an exit code.';
        console.log(message);
        logToDatabase('Task', message);
    });

    // Capture breakpoints set in the editor
    vscode.debug.onDidChangeBreakpoints((e) => {
        e.added.forEach((breakpoint) => {
            if (breakpoint instanceof vscode.SourceBreakpoint) {
                const message = `Breakpoint added at file: ${breakpoint.location.uri.fsPath}, line: ${breakpoint.location.range.start.line}`;
                console.log(message);
                logToDatabase('Breakpoint', message);
            }
        });

        e.removed.forEach((breakpoint) => {
            if (breakpoint instanceof vscode.SourceBreakpoint) {
                const message = `Breakpoint removed at file: ${breakpoint.location.uri.fsPath}, line: ${breakpoint.location.range.start.line}`;
                console.log(message);
                logToDatabase('Breakpoint', message);
            }
        });
    });

    // Capture error and warning messages from diagnostics
    vscode.languages.onDidChangeDiagnostics((e) => {
        e.uris.forEach((uri) => {
            const diagnostics = vscode.languages.getDiagnostics(uri);
            diagnostics.forEach((diagnostic) => {
                const severity = diagnostic.severity === vscode.DiagnosticSeverity.Error ? 'Error' : 'Warning';
                const file = uri.fsPath;
                const line = diagnostic.range.start.line;
                const column = diagnostic.range.start.character;
                const message = `[${severity}] ${file}:${line}:${column} - ${diagnostic.message}`;
                console.log(message);
                logToDatabase(severity, message);
            });
        });
    });

    // Register the command for testing
    const disposable = vscode.commands.registerCommand('feedback-collector.helloWorld', () => {
        const message = 'Hello World from feedback collector!';
        vscode.window.showInformationMessage(message);
        logToDatabase('Command', message);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('Feedback collector extension is now deactivated!');
}

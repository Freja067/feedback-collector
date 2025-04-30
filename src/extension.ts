import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension activation started...');
    console.log('Feedback collector extension is now active!');

    // Define the JSON file path
    const logFilePath = path.join(__dirname, 'feedback-collector.json');
    console.log(`Log file path: ${logFilePath}`);

    // Ensure the JSON file exists
    if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, JSON.stringify([])); // Initialize with an empty array
        console.log('Log file created.');
    }

    // Register event listeners and commands
    registerEventListeners(logFilePath, context);
}

function registerEventListeners(logFilePath: string, context: vscode.ExtensionContext) {
    // Helper function to log to the JSON file
    const logToJSONFile = (type: string, message: string) => {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, type, message };

        // Read the existing logs
        const logs = JSON.parse(fs.readFileSync(logFilePath, 'utf-8'));

        // Append the new log entry
        logs.push(logEntry);

        // Write the updated logs back to the file
        fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
        console.log(`Log written to file: [${type}] ${message}`);
    };

    // Provide a command to run the Maven build
    vscode.commands.registerCommand('feedback-collector.runMavenBuild', async () => {
        // Prompt the user to select the Maven project folder
        const folderUri = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Select Maven Project Folder'
        });

        if (!folderUri || folderUri.length === 0) {
            vscode.window.showErrorMessage('No folder selected.');
            return;
        }

        const projectPath = folderUri[0].fsPath;
        const terminal = vscode.window.createTerminal('Maven Build');
        terminal.show();

        // Define the log file path
        const buildLogFilePath = path.join(__dirname, 'build-logs.txt');
        console.log(`Capturing Maven build logs to: ${buildLogFilePath}`);

        // Navigate to the selected project directory
        terminal.sendText(`cd ${projectPath}`);

        // Run the Maven build command and redirect output to a file
        terminal.sendText(`/bin/bash -c "mvn clean install > ${buildLogFilePath} 2>&1"`);

        // Log the command execution
        logToJSONFile('Command', `Maven build command executed: mvn clean install > ${buildLogFilePath} 2>&1`);
    });

    vscode.commands.registerCommand('feedback-collector.runGradleBuild', async () => {
        const folderUri = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Select Gradle Project Folder'
        });

        if (!folderUri || folderUri.length === 0) {
            vscode.window.showErrorMessage('No folder selected.');
            return;
        }

        const projectPath = folderUri[0].fsPath;
        const terminal = vscode.window.createTerminal('Gradle Build');
        terminal.show();

       // Define the log file path
       const buildLogFilePath = path.join(__dirname, 'build-logs.txt');

       console.log(`Capturing Gradle build logs to: ${buildLogFilePath}`);
       // Navigate to the selected project directory
       terminal.sendText(`cd ${projectPath}`);

       // Run the Maven build command and redirect output to a file
       terminal.sendText(`/bin/bash -c "gradle clean build > ${buildLogFilePath} 2>&1"`);

       // Log the command execution
       logToJSONFile('Command', `gradle build command executed: gradle clean build > ${buildLogFilePath} 2>&1`);
   });

    // Monitor the log file for changes (optional)
    const buildLogFilePath = path.join(__dirname, 'build-logs.txt');
    if (fs.existsSync(buildLogFilePath)) {
        fs.watchFile(buildLogFilePath, () => {
            const logs = fs.readFileSync(buildLogFilePath, 'utf-8');
            console.log('Latest build logs:', logs);
            logToJSONFile('Build Logs', logs);
        });
    }

    // Capture terminal open events
    vscode.window.onDidOpenTerminal((terminal) => {
        const message = `Terminal opened: ${terminal.name}`;
        console.log(message);
        logToJSONFile('Terminal', message);
    });

    // Capture task start and end
    vscode.tasks.onDidStartTask((e) => {
        const message = `Task started: ${e.execution.task.name}`;
        console.log(message);
        logToJSONFile('Task', message);
    });

    vscode.tasks.onDidEndTaskProcess((e) => {
        const message = e.exitCode !== undefined
            ? `Task finished with exit code: ${e.exitCode}`
            : 'Task finished without an exit code.';
        console.log(message);
        logToJSONFile('Task', message);
    });

    // Capture breakpoints set in the editor
    vscode.debug.onDidChangeBreakpoints((e) => {
        e.added.forEach((breakpoint) => {
            if (breakpoint instanceof vscode.SourceBreakpoint) {
                const message = `Breakpoint added at file: ${breakpoint.location.uri.fsPath}, line: ${breakpoint.location.range.start.line}`;
                console.log(message);
                logToJSONFile('Breakpoint', message);
            }
        });

        e.removed.forEach((breakpoint) => {
            if (breakpoint instanceof vscode.SourceBreakpoint) {
                const message = `Breakpoint removed at file: ${breakpoint.location.uri.fsPath}, line: ${breakpoint.location.range.start.line}`;
                console.log(message);
                logToJSONFile('Breakpoint', message);
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
                logToJSONFile(severity, message);
            });
        });
    });

    // Register a command for testing
    const disposable = vscode.commands.registerCommand('feedback-collector.helloWorld', () => {
        const message = 'Hello World from feedback collector!';
        vscode.window.showInformationMessage(message);
        logToJSONFile('Command', message);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('Feedback collector extension is now deactivated!');
}

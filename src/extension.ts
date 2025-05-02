import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension activation started...');
    console.log('Feedback collector extension is now active!');

    // Define the JSON file path
    const logFilePath = path.join(__dirname, 'feedback-collector.ndjson');
    console.log(`Log file path: ${logFilePath}`);

    // Ensure the JSON file exists
    if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, ''); // Initialize with an empty array
        console.log('Log file created.');
    }

    // Register event listeners and commands
    registerEventListeners(logFilePath, context);
}

function registerEventListeners(logFilePath: string, context: vscode.ExtensionContext) {
    // Helper function to log to the JSON file
    const logToJSONFile = (type: string, rawMessage: string) => {
        const timestamp = new Date().toISOString();
    
        // Extract file path (optional, depends on message format)
        const regex = /\[(\w+)\] (.*?):(\d+):(\d+) - (.*)/;
        const match = rawMessage.match(regex);
    
        let logEntry;
        if (match) {
            const [, severity, file, line, column, message] = match;
            logEntry = {
                timestamp,
                type,
                file,
                line: parseInt(line),
                column: parseInt(column),
                message
            };
        } else {
            // Fallback if message doesn't match expected pattern
            logEntry = { timestamp, type, message: rawMessage };
        }
    
        fs.appendFileSync(logFilePath, JSON.stringify(logEntry) + '\n');
        console.log(`Log written: ${JSON.stringify(logEntry)}`);
    };
    

    vscode.commands.registerCommand('feedback-collector.runMavenBuild', async () => {
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
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // sanitize for filenames
        const buildLogFilePath = path.join(__dirname, `build-logs-${timestamp}.txt`);
        console.log('mvn process started')
    
        // Use configured Maven path or default to 'mvn'
        const mavenPath = '/Users/FrejaVindum/Desktop/apache-maven-3.9.9/bin/mvn'; //Hardcoded path for testing
    
        exec(`${mavenPath} clean install`, {
            cwd: projectPath,
            env: {
                ...process.env,
                PATH: `${path.dirname(mavenPath)}:${process.env.PATH ?? ''}`
            }
        }, (error, stdout, stderr) => {
            fs.writeFileSync(buildLogFilePath, stdout + stderr);
    
            const status = error ? 'FAILED' : 'PASSED';
            const logMessage = `Maven build ${status}. Logs saved to ${buildLogFilePath}`;
            console.log(logMessage);
            logToJSONFile('Build', logMessage);
        });
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
        const buildLogFilePath = path.join(__dirname, 'build-logs.txt');
    
        exec('gradle clean build', { cwd: projectPath }, (error, stdout, stderr) => {
            fs.writeFileSync(buildLogFilePath, stdout + stderr);
            
            const status = error ? 'FAILED' : 'PASSED';
            const logMessage = `Gradle build ${status}. Logs saved to ${buildLogFilePath}`;
            console.log(logMessage);
            logToJSONFile('Build', logMessage);
        });
    });


    // Capture terminal open events
    vscode.window.onDidOpenTerminal((terminal) => {
        const message = `Terminal opened: ${terminal.name}`;
        console.log(message);
        //logToJSONFile('Terminal', message);
    });

    // Capture task start and end
    vscode.tasks.onDidStartTask((e) => {
        const message = `Task started: ${e.execution.task.name}`;
        console.log(message);
        //logToJSONFile('Task', message);
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

      // Store logged diagnostics to avoid duplicates
      const loggedDiagnostics = new Set<string>();

      // Capture error and warning messages from diagnostics
      vscode.languages.onDidChangeDiagnostics((e) => {
          e.uris.forEach((uri) => {
              const diagnostics = vscode.languages.getDiagnostics(uri);
              diagnostics.forEach((diagnostic) => {
                  const severity = diagnostic.severity === vscode.DiagnosticSeverity.Error ? 'Error' : 'Warning';
                  const file = uri.fsPath;
                  const line = diagnostic.range.start.line;
                  const column = diagnostic.range.start.character;
                  const messageText = diagnostic.message;
  
                  // Generate a unique key for the diagnostic
                  const key = `${severity}:${file}:${line}:${column}:${messageText}`;
                  
                  // Only log if we haven't seen this diagnostic before
                  if (!loggedDiagnostics.has(key)) {
                      loggedDiagnostics.add(key);
                      const message = `[${severity}] ${file}:${line}:${column} - ${messageText}`;
                      console.log(message);
                      logToJSONFile(severity, message);
                  }
              });
          });
      });

}

export function deactivate() {
    console.log('Feedback collector extension is now deactivated!');
}

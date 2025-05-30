import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

let extensionContext: vscode.ExtensionContext;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Extension activation started...');
    console.log('Feedback collector extension is now active!');
    const developerID = await vscode.window.showInputBox({
        prompt: 'Enter your developer ID',
        placeHolder: 'Developer ID',
        validateInput: (input) => {
            if (!input) {
                return 'Developer ID cannot be empty.';
            }
        }
    });

    const iterationID = await vscode.window.showInputBox({
        prompt: 'Enter the iteratio ID',
        placeHolder: 'iteration ID',
        validateInput: (input) => {
            if (!input) {
                return 'iteration ID cannot be empty.';
            }
        }
    });
    extensionContext = context;
    await context.globalState.update('developerID', developerID);
    await context.globalState.update('iterationID', iterationID);
    
    // Define the JSON file path
    const logFilePath = path.join(__dirname, 'feedback-collector.ndjson');
    console.log(`Log file path: ${logFilePath}`);

    // Checks if the JSON file exists
 
     fs.writeFileSync(logFilePath, ''); // Initialize with an empty array
    console.log('Log file created/cleared.');


    // Register event listeners and commands
    registerEventListeners(logFilePath, context);
}

function registerEventListeners(logFilePath: string, context: vscode.ExtensionContext) {
    // Helper function to log to the JSON file
    const logToJSONFile = (type: string, rawMessage: string) => {
        const timestamp = new Date().toISOString();
    
        // Extract file path and line number from the raw message
        const regex = /\[(\w+)\] (.*?):(\d+):(\d+) - (.*)/;
        const match = rawMessage.match(regex);
    
        let logEntry;
        if (match) {
            const [, severity, file, line, column, message] = match;
            const normalizedFile = file.replace(/\\/g, '/');
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            let relativeFile = normalizedFile;
            if (workspaceFolder && normalizedFile.startsWith(workspaceFolder)) {
                relativeFile = path.relative(workspaceFolder, normalizedFile);
            } 

            logEntry = {
                timestamp,
                type,
                file: relativeFile,
                line: parseInt(line),
                message, 
                developerID: context.globalState.get('developerID'),
                iterationID: context.globalState.get('iterationID'),
                buildLogFilePath: null
            };
        } 
        else {
            // Fallback if message doesn't match expected pattern
            logEntry = {
                timestamp,
                type,
                file: null,
                line: null,
                message: rawMessage,
                developerID: context.globalState.get('developerID') ?? null,
                iterationID: context.globalState.get('iterationID') ?? null,
                buildLogFilePath: context.globalState.get('buildLogFilePath') ?? null
            };
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
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const buildLogFilePathAbs = path.join(__dirname, `build-logs-${timestamp}.txt`);
        // Make the path relative to the workspace/project root
        const buildLogFilePath = workspaceFolder
            ? path.relative(workspaceFolder, buildLogFilePathAbs)
            : buildLogFilePathAbs;
        console.log('mvn process started');

        const mavenPath = '/Users/FrejaVindum/Desktop/apache-maven-3.9.9/bin/mvn'; //Hardcoded path for testing

        exec(`${mavenPath} clean install`, {
            cwd: projectPath,
            env: {
                ...process.env,
                PATH: `${path.dirname(mavenPath)}:${process.env.PATH ?? ''}`
            }
        }, (error, stdout, stderr) => {
            fs.writeFileSync(buildLogFilePathAbs, stdout + stderr);

            const status = error ? 'FAILED' : 'PASSED';
            const logMessage = `Maven build ${status}. Logs saved to ${buildLogFilePath}`;
            console.log(logMessage);
            logToJSONFile('Build', logMessage);
        });

        await context.globalState.update('buildLogFilePath', buildLogFilePath);
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
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const buildLogFilePathAbs = path.join(__dirname, 'build-logs.txt');
        const buildLogFilePath = workspaceFolder
            ? path.relative(workspaceFolder, buildLogFilePathAbs)
            : buildLogFilePathAbs;

        exec('gradle clean build', { cwd: projectPath }, (error, stdout, stderr) => {
            fs.writeFileSync(buildLogFilePathAbs, stdout + stderr);

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
// Function to ship feedback data to the database folder
// function shipFeedbackDataToDatabaseFolder() {
//     const baseProjectDir = path.resolve(__dirname, '../../');
//     const outputDir = path.join(baseProjectDir, 'Feedback database setup');

//     if (!fs.existsSync(outputDir)) {
//         fs.mkdirSync(outputDir, { recursive: true });
//     }

//     const filesToMove = [
//         'feedback-collector.ndjson',
//         ...fs.readdirSync(__dirname).filter(f => f.endsWith('.txt'))
//     ];

//     filesToMove.forEach(filename => {
//         const source = path.join(__dirname, filename);
//         const dest = path.join(outputDir, filename);
//         if (fs.existsSync(source)) {
//             fs.copyFileSync(source, dest);
//             console.log(`Shipped file: ${filename} to ${outputDir}`);
//         }
//     });
// }



export function deactivate() {
    console.log('Feedback collector extension is now deactivated!');
    // shipFeedbackDataToDatabaseFolder();
}

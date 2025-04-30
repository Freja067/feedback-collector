"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
function activate(context) {
  console.log("Extension activation started...");
  console.log("Feedback collector extension is now active!");
  const logFilePath = path.join(__dirname, "feedback-collector.json");
  console.log(`Log file path: ${logFilePath}`);
  if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, JSON.stringify([]));
    console.log("Log file created.");
  }
  registerEventListeners(logFilePath, context);
}
function registerEventListeners(logFilePath, context) {
  const logToJSONFile = (type, message) => {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const logEntry = { timestamp, type, message };
    const logs = JSON.parse(fs.readFileSync(logFilePath, "utf-8"));
    logs.push(logEntry);
    fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
    console.log(`Log written to file: [${type}] ${message}`);
  };
  vscode.commands.registerCommand("feedback-collector.runMavenBuild", async () => {
    const folderUri = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: "Select Maven Project Folder"
    });
    if (!folderUri || folderUri.length === 0) {
      vscode.window.showErrorMessage("No folder selected.");
      return;
    }
    const projectPath = folderUri[0].fsPath;
    const terminal = vscode.window.createTerminal("Maven Build");
    terminal.show();
    const buildLogFilePath2 = path.join(__dirname, "build-logs.txt");
    console.log(`Capturing Maven build logs to: ${buildLogFilePath2}`);
    terminal.sendText(`cd ${projectPath}`);
    terminal.sendText(`/bin/bash -c "mvn clean install > ${buildLogFilePath2} 2>&1"`);
    logToJSONFile("Command", `Maven build command executed: mvn clean install > ${buildLogFilePath2} 2>&1`);
  });
  vscode.commands.registerCommand("feedback-collector.runGradleBuild", async () => {
    const folderUri = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: "Select Gradle Project Folder"
    });
    if (!folderUri || folderUri.length === 0) {
      vscode.window.showErrorMessage("No folder selected.");
      return;
    }
    const projectPath = folderUri[0].fsPath;
    const terminal = vscode.window.createTerminal("Gradle Build");
    terminal.show();
    const buildLogFilePath2 = path.join(__dirname, "build-logs.txt");
    console.log(`Capturing Gradle build logs to: ${buildLogFilePath2}`);
    terminal.sendText(`cd ${projectPath}`);
    terminal.sendText(`/bin/bash -c "gradle clean build > ${buildLogFilePath2} 2>&1"`);
    logToJSONFile("Command", `gradle build command executed: gradle clean build > ${buildLogFilePath2} 2>&1`);
  });
  const buildLogFilePath = path.join(__dirname, "build-logs.txt");
  if (fs.existsSync(buildLogFilePath)) {
    fs.watchFile(buildLogFilePath, () => {
      const logs = fs.readFileSync(buildLogFilePath, "utf-8");
      console.log("Latest build logs:", logs);
      logToJSONFile("Build Logs", logs);
    });
  }
  vscode.window.onDidOpenTerminal((terminal) => {
    const message = `Terminal opened: ${terminal.name}`;
    console.log(message);
    logToJSONFile("Terminal", message);
  });
  vscode.tasks.onDidStartTask((e) => {
    const message = `Task started: ${e.execution.task.name}`;
    console.log(message);
    logToJSONFile("Task", message);
  });
  vscode.tasks.onDidEndTaskProcess((e) => {
    const message = e.exitCode !== void 0 ? `Task finished with exit code: ${e.exitCode}` : "Task finished without an exit code.";
    console.log(message);
    logToJSONFile("Task", message);
  });
  vscode.debug.onDidChangeBreakpoints((e) => {
    e.added.forEach((breakpoint) => {
      if (breakpoint instanceof vscode.SourceBreakpoint) {
        const message = `Breakpoint added at file: ${breakpoint.location.uri.fsPath}, line: ${breakpoint.location.range.start.line}`;
        console.log(message);
        logToJSONFile("Breakpoint", message);
      }
    });
    e.removed.forEach((breakpoint) => {
      if (breakpoint instanceof vscode.SourceBreakpoint) {
        const message = `Breakpoint removed at file: ${breakpoint.location.uri.fsPath}, line: ${breakpoint.location.range.start.line}`;
        console.log(message);
        logToJSONFile("Breakpoint", message);
      }
    });
  });
  vscode.languages.onDidChangeDiagnostics((e) => {
    e.uris.forEach((uri) => {
      const diagnostics = vscode.languages.getDiagnostics(uri);
      diagnostics.forEach((diagnostic) => {
        const severity = diagnostic.severity === vscode.DiagnosticSeverity.Error ? "Error" : "Warning";
        const file = uri.fsPath;
        const line = diagnostic.range.start.line;
        const column = diagnostic.range.start.character;
        const message = `[${severity}] ${file}:${line}:${column} - ${diagnostic.message}`;
        console.log(message);
        logToJSONFile(severity, message);
      });
    });
  });
  const disposable = vscode.commands.registerCommand("feedback-collector.helloWorld", () => {
    const message = "Hello World from feedback collector!";
    vscode.window.showInformationMessage(message);
    logToJSONFile("Command", message);
  });
  context.subscriptions.push(disposable);
}
function deactivate() {
  console.log("Feedback collector extension is now deactivated!");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map

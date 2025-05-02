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
var import_child_process = require("child_process");
function activate(context) {
  console.log("Extension activation started...");
  console.log("Feedback collector extension is now active!");
  const logFilePath = path.join(__dirname, "feedback-collector.ndjson");
  console.log(`Log file path: ${logFilePath}`);
  if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, "");
    console.log("Log file created.");
  }
  registerEventListeners(logFilePath, context);
}
function registerEventListeners(logFilePath, context) {
  const logToJSONFile = (type, rawMessage) => {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
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
      logEntry = { timestamp, type, message: rawMessage };
    }
    fs.appendFileSync(logFilePath, JSON.stringify(logEntry) + "\n");
    console.log(`Log written: ${JSON.stringify(logEntry)}`);
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
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const buildLogFilePath = path.join(__dirname, `build-logs-${timestamp}.txt`);
    console.log("mvn process started");
    const mavenPath = "/Users/FrejaVindum/Desktop/apache-maven-3.9.9/bin/mvn";
    (0, import_child_process.exec)(`${mavenPath} clean install`, {
      cwd: projectPath,
      env: {
        ...process.env,
        PATH: `${path.dirname(mavenPath)}:${process.env.PATH ?? ""}`
      }
    }, (error, stdout, stderr) => {
      fs.writeFileSync(buildLogFilePath, stdout + stderr);
      const status = error ? "FAILED" : "PASSED";
      const logMessage = `Maven build ${status}. Logs saved to ${buildLogFilePath}`;
      console.log(logMessage);
      logToJSONFile("Build", logMessage);
    });
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
    const buildLogFilePath = path.join(__dirname, "build-logs.txt");
    (0, import_child_process.exec)("gradle clean build", { cwd: projectPath }, (error, stdout, stderr) => {
      fs.writeFileSync(buildLogFilePath, stdout + stderr);
      const status = error ? "FAILED" : "PASSED";
      const logMessage = `Gradle build ${status}. Logs saved to ${buildLogFilePath}`;
      console.log(logMessage);
      logToJSONFile("Build", logMessage);
    });
  });
  vscode.window.onDidOpenTerminal((terminal) => {
    const message = `Terminal opened: ${terminal.name}`;
    console.log(message);
  });
  vscode.tasks.onDidStartTask((e) => {
    const message = `Task started: ${e.execution.task.name}`;
    console.log(message);
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
  const loggedDiagnostics = /* @__PURE__ */ new Set();
  vscode.languages.onDidChangeDiagnostics((e) => {
    e.uris.forEach((uri) => {
      const diagnostics = vscode.languages.getDiagnostics(uri);
      diagnostics.forEach((diagnostic) => {
        const severity = diagnostic.severity === vscode.DiagnosticSeverity.Error ? "Error" : "Warning";
        const file = uri.fsPath;
        const line = diagnostic.range.start.line;
        const column = diagnostic.range.start.character;
        const messageText = diagnostic.message;
        const key = `${severity}:${file}:${line}:${column}:${messageText}`;
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
function deactivate() {
  console.log("Feedback collector extension is now deactivated!");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map

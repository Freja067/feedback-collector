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
function activate(context) {
  console.log("Feedback collector extension is now active!");
  vscode.window.onDidOpenTerminal((terminal) => {
    console.log(`Terminal opened: ${terminal.name}`);
    terminal.sendText('echo "Terminal opened: " && echo Hello from feedback-collector!');
    terminal.processId.then((pid) => {
      console.log(`Terminal with PID: ${pid} is open`);
    });
  });
  vscode.tasks.onDidStartTask((e) => {
    console.log(`Task started: ${e.execution.task.name}`);
  });
  vscode.tasks.onDidEndTaskProcess((e) => {
    if (e.exitCode !== void 0) {
      console.log(`Task finished with exit code: ${e.exitCode}`);
    } else {
      console.log("Task finished without an exit code.");
    }
  });
  const breakpoints = vscode.debug.breakpoints;
  breakpoints.forEach((breakpoint) => {
    if (breakpoint instanceof vscode.SourceBreakpoint) {
      console.log(`Breakpoint set at file: ${breakpoint.location.uri.fsPath}, line: ${breakpoint.location.range.start.line}`);
    }
  });
  vscode.debug.onDidChangeBreakpoints((e) => {
    e.added.forEach((breakpoint) => {
      if (breakpoint instanceof vscode.SourceBreakpoint) {
        console.log(`Breakpoint added at file: ${breakpoint.location.uri.fsPath}, line: ${breakpoint.location.range.start.line}`);
      }
    });
    e.removed.forEach((breakpoint) => {
      if (breakpoint instanceof vscode.SourceBreakpoint) {
        console.log(`Breakpoint removed at file: ${breakpoint.location.uri.fsPath}, line: ${breakpoint.location.range.start.line}`);
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
        console.log(`[${severity}] ${file}:${line}:${column} - ${diagnostic.message}`);
      });
    });
  });
  const disposable = vscode.commands.registerCommand("feedback-collector.helloWorld", () => {
    vscode.window.showInformationMessage("Hello World from feedback collector!");
  });
  context.subscriptions.push(disposable);
}
function deactivate() {
}
console.log("Feedback collector extension is now deactivated!");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map

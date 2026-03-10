import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

function getChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel('Copilot Local Memory');
  }
  return channel;
}

export function info(message: string, ...args: unknown[]): void {
  try {
    getChannel().appendLine(message + (args.length ? ' ' + args.map(String).join(' ') : ''));
  } catch {
    // Ignore output channel failures.
  }
  console.log(message, ...args);
}

export function error(message: string, ...args: unknown[]): void {
  try {
    getChannel().appendLine(
      'ERROR: ' + message + (args.length ? ' ' + args.map(String).join(' ') : '')
    );
  } catch {
    // Ignore output channel failures.
  }
  console.error(message, ...args);
}
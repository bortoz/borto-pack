/** @babel */

import { CompositeDisposable } from 'atom';
import child_process from 'child_process';
import { spawnClangFormat } from 'clang-format';
import { promises as fs } from 'fs';
import path from 'path';
import { shell } from 'electron';
import Queue from 'better-queue';
import Testcase from './util/testcase';
import TestcasePanel from './views/testcase-panel';
import CompilerParser from './util/compiler-parser';
import CompilerPanel from './views/compiler-panel';

let nextId = 0;
let signalProvider = null;
let buildVersions = new Map();

function getUniqueId() {
  return `borto-test-${nextId++}`;
}

async function update(e) {
  let info = {
    ext: process.platform.startsWith('win') ? '.exe' : '',
    loaderPath: path.join(__dirname, 'runtime', 'loader.py'),
  };
  let editor = atom.workspace.getActiveTextEditor();
  if (!editor) {
    atom.notifications.addError('<strong>Could not find editor</strong>');
    return false;
  }
  info.fileType = editor.getGrammar().name;
  info.file = editor.getBuffer().file;
  info.tabLength = editor.getTabLength();
  if (!info.file) {
    atom.notifications.addError('<strong>File not found</strong><br>Save before running a command');
    return false;
  }
  try {
    await editor.save();
  } catch (error) {
    atom.notifications.addError('<strong>Could not save the file</strong>', {
      detail: error
    });
    return false;
  }
  info.filePath = info.file.path;
  let { base, dir, name } = path.parse(info.filePath);
  info.base = base;
  info.dir = dir;
  info.name = name;
  return info;
}

export function setBusySignalProvider(provider) {
  signalProvider = provider;
}

export async function build(e, i) {
  let info = i || (await update(e));
  if (!info) return false;
  switch (info.fileType) {
    case 'C':
      var command = `${atom.config.get('borto-pack.cCompiler')} -o "${path.join(info.dir, info.name)}${info.ext}" ${atom.config.get('borto-pack.cOptions')} "${info.filePath}"`;
      break;
    case 'C++':
      var command = `${atom.config.get('borto-pack.cppCompiler')} -o "${path.join(info.dir, info.name)}${info.ext}" ${atom.config.get('borto-pack.cppOptions')} "${info.filePath}"`;
      break;
    default:
      atom.notifications.addError('<strong>Unrecognized file type</strong>');
      return false;
  }
  let options = { cwd: info.dir };
  if (signalProvider) {
    let buildVersion = buildVersions.get(info.filePath) || 1;
    var buildMessage = `Building ${info.base} - #${buildVersion}`;
    buildVersions.set(info.filePath, buildVersion + 1);
    signalProvider.add(buildMessage);
  }
  return await new Promise((resolve, reject) => {
    child_process.exec(command, options, async (error, stdout, stderr) => {
      if (signalProvider) signalProvider.remove(buildMessage);
      stderr = String(stderr);
      if (stderr) {
        let parser = new CompilerParser(stderr);
        let compilerPanel = await atom.workspace.open(CompilerPanel.COMPILER_PANEL_URI);
        compilerPanel.setParser(parser, stderr);
      } else {
        let pane = atom.workspace.paneForURI(CompilerPanel.COMPILER_PANEL_URI);
        if (pane) pane.itemForURI(CompilerPanel.COMPILER_PANEL_URI).setParser(null, '');
        atom.workspace.hide(CompilerPanel.COMPILER_PANEL_URI);
      }
      if (error) {
        atom.notifications.addError('<strong>Compilation failed</strong>');
        resolve(false);
      } else {
        atom.notifications.addSuccess('<strong>Compilation successful</strong>');
        resolve(true);
      }
    });
  });
}

export async function run(e, i) {
  let info = i || (await update(e));
  if (!info) return false;
  let pyCompiler = atom.config.get('borto-pack.pyCompiler');
  switch (info.fileType) {
    case 'C':
    case 'C++':
      var exeFile = path.join(info.dir, info.name).concat(info.ext);
      var exeArgs = [exeFile];
      break;
    case 'Python':
      var exeFile = info.filePath;
      var exeArgs = [pyCompiler, exeFile];
      break;
    default:
      atom.notifications.addError('<strong>Unrecognized file type</strong>');
      return false;
  }
  try {
    await fs.access(exeFile);
  } catch (error) {
    atom.notifications.addError('<strong>Executable file not found</strong>');
    return false;
  }
  let terminal = atom.config.get('borto-pack.terminal');
  let profile = atom.config.get('borto-pack.terminalProfile');
  switch (terminal) {
    case 'conhost':
      var command = 'conhost';
      var args = [pyCompiler, info.loaderPath, ...exeArgs];
      break;
      break;
    case 'Windows Terminal':
      var command = 'wt';
      var args = [...(profile ? ['-p', profile] : []), '-d', info.dir, pyCompiler, info.loaderPath, ...exeArgs];
      break;
    case 'GNOME':
      var command = 'gnome-terminal';
      var args = [...(profile ? ['--profile', profile] : []), '-t', info.name, '--', pyCompiler, info.loaderPath, ...exeArgs];
      break;
    case 'mate':
      var command = 'mate-terminal';
      var args = ['-t', info.name, '--', pyCompiler, info.loaderPath,...exeArgs];
      break;
    case 'xterm':
      var command = 'xterm';
      var args = ['-T', info.name, '-e', pyCompiler, info.loaderPath,...exeArgs];
      break;
    case 'Konsole':
      var command = 'konsole';
      var args = [...(profile ? ['--profile', profile] : []), '-p', `tabtitle=${info.name}`, '-e', pyCompiler, info.loaderPath, ...exeArgs];
      break;
    case 'Xfce':
      var command = 'xfce4-terminal';
      var args = ['-T', info.name, '-x', pyCompiler, info.loaderPath, ...exeArgs];
      break;
    case 'Pantheon':
      var command = 'io.elementary.terminal';
      var args = ['-x', pyCompiler, info.loaderPath, ...exeArgs];
      break;
    case 'URxvt':
      var command = 'urxvt';
      var args = ['-title', info.name, '-e', pyCompiler, info.loaderPath, ...exeArgs];
      break;
  }
  let options = { cwd: info.dir };
  return await new Promise((resolve, reject) => {
    child_process.execFile(command, args, options, error => {
      if (terminal != 'mate' && error) {
        atom.notifications.addError('<strong>Error while executing file</strong>', {
          detail: error
        });
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

export async function buildAndRun(e) {
  let info = await update(e);
  if (!await build(e, info)) return false;
  if (!await run(e, info)) return false;
  return true;
}

export async function multiRun(e) {
  let info = await update(e);
  if (!info) return false;
  switch (info.fileType) {
    case 'C':
    case 'C++':
      var exeFile = path.join(info.dir, info.name).concat(info.ext);
      var command = exeFile;
      var args = [];
      break;
    case 'Python':
      var exeFile = info.filePath;
      var command = atom.config.get('borto-pack.pyCompiler');
      var args = [exeFile];
      break;
    default:
      atom.notifications.addError('<strong>Unrecognized file type</strong>');
      return false;
  }
  let commandOptions = { cwd: info.dir };
  try {
    await fs.access(exeFile);
  } catch (error) {
    atom.notifications.addError('<strong>Executable file not found</strong>');
    return false;
  }
  try {
    var inputFiles = await fs.readdir(path.join(info.dir, 'input/'));
  } catch (error) {
    atom.notifications.addError(`<strong>Could not open 'input' directory</strong>`, {
      detail: error
    });
    return false;
  }
  let outputFolder = path.join(info.dir, 'output/');
  try {
    await fs.readdir(outputFolder);
  } catch (error) {
    try {
      await fs.mkdir(outputFolder);
    } catch (error) {
      atom.notifications.addError(`<strong>Could not open 'output' directory</strong>`, {
        detail: error
      });
      return false;
    }
  }
  for (let notification of atom.notifications.getNotifications()) {
    notification.dismissed = false;
    notification.options.dismissable = true;
    notification.dismiss();
  }

  let testcases = inputFiles.map(inputFile => new Testcase({
    id: getUniqueId(),
    dir: info.dir,
    source: info.filePath,
    inputFile: inputFile,
    command: command,
    args: args,
    options: commandOptions,
  }));
  var testcasePanel = await atom.workspace.open(TestcasePanel.TESTCASE_PANEL_URI);
  testcasePanel.setTestcases(testcases);

  let queueOptions = { concurrent: atom.config.get('borto-pack.multiRunWorker') };
  let queue = new Queue((testcase, callback) => {
    testcase.start();
    testcase.onExit(callback);
  }, queueOptions);

  for (let tc of testcases) {
    queue.push(tc);
  }
}

export async function beautify(e) {
  let info = await update(e);
  if (!info) return false;
  switch (info.fileType) {
    case 'C':
    case 'C++':
      try {
        var options = JSON.parse(atom.config.get('borto-pack.cppBeautifyOptions'));
      } catch (error) {
        atom.notifications.addWarning('<strong>Unrecognized beautify options</strong>', {
          detail: error
        });
        var options = {};
      }
      Object.assign(options, {
        BasedOnStyle: atom.config.get('borto-pack.cppBeautify'),
        IndentWidth: info.tabLength,
      })
      return await new Promise((resolve, reject) => {
        spawnClangFormat(['-i', info.filePath, '-style', JSON.stringify(options)], error => {
          if (error) {
            atom.notifications.addError(`<strong>Unable to beautify current file</strong>`, {
              detail: error
            });
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    case 'Python':
      try {
        var options = JSON.parse(atom.config.get('borto-pack.pyBeautifyOptions'));
      } catch (error) {
        atom.notifications.addWarning('<strong>Unrecognized beautify options</strong>', {
          detail: error
        });
        var options = {};
      }
      Object.assign(options, {
        based_on_style: atom.config.get('borto-pack.pyBeautify'),
        indent_width: info.tabLength,
      })
      var command = 'yapf';
      var args = ['-i', info.filePath, '--style', JSON.stringify(options)];
      break;
    default:
      atom.notifications.addError('<strong>Unrecognized file type</strong>');
      return false;
  }
  return await new Promise((resolve, reject) => {
    child_process.execFile(command, args, error => {
      if (error) {
        atom.notifications.addError(`<strong>Unable to beautify current file</strong>`, {
          detail: error
        });
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

export function copy(e) {
  atom.clipboard.write(window.getSelection().toString());
}

export async function search(e) {
  try {
    await shell.openExternal('https://google.com/search?q=' + encodeURI(window.getSelection().toString()));
  } catch (error) {
    atom.notifications.addError('<strong>Failed to search on google</strong>', {
      detail: error
    });
  }
}

function getFilepathForTarget(e) {
  let target = e.target.closest('.borto-log-file');
  return {
    path: target.getAttribute('data-path'),
    line: parseInt(target.getAttribute('data-line')),
    column: parseInt(target.getAttribute('data-column')),
  };
}

export async function openTestcase(e) {
  let target = e.target.closest('.borto-testcase');
  let sourceFile = target.getAttribute('source-file');
  let inputFile = target.getAttribute('input-file');
  let outputFile = target.getAttribute('output-file');
  try {
    await atom.workspace.open(inputFile, { split: 'down' });
    await atom.workspace.open(outputFile, { split: 'right' });
  } catch (error) {
    atom.notifications.addError('<strong>Could not open testcase</strong>', {
      detail: error,
    });
  }
}

export async function openFile(e) {
  let file = getFilepathForTarget(e);
  try {
    await fs.access(file.path);
    var editor = await atom.workspace.open(file.path, {
      initialLine: !isNaN(file.line) ? file.line : 0,
      initialColumn: !isNaN(file.column) ? file.column : 0,
    });
  } catch (error) {
    atom.notifications.addError('<strong>Source file not found</strong>', {
      detail: error,
    });
  }
}

export function openExplorer(e) {
  let file = getFilepathForTarget(e).path;
  shell.showItemInFolder(file);
}

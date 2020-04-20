/** @babel */
import { CompositeDisposable, Notification } from 'atom';
import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import pump from 'pump';
import through from 'through2';
import CompilerPanel from './views/compiler-panel';
import TestcasePanel from './views/testcase-panel';
const fsp = fs.promises;

let ext = process.platform.startsWith('win32') ? '.exe' : '';
let loaderPath = path.join(__dirname, 'loader.py');
let nextId = 0;
let fileType = null;
let filePath = null;
let file = null;
let dir = null;
let name = null;
let tabLength = null;

function getUniqueId() {
  return `borto-test-${nextId++}`;
}

async function update(e) {
  let element = e.target;
  while (element && !('activeItemPath' in element.dataset)) {
    element = element.parentElement;
  }
  if (!element) {
    atom.notifications.addError('<strong>Could not find editor</strong>');
    return false;
  }
  let editor = atom.workspace.getTextEditors().find(t => t.getBuffer().file.path === element.dataset.activeItemPath);
  if (!editor) {
    atom.notifications.addError('<strong>Could not find editor</strong>');
    return false;
  }
  fileType = editor.getGrammar().name;
  file = editor.getBuffer().file;
  tabLength = editor.getTabLength();
  if (!file) {
    atom.notifications.addError('<strong>File not found</strong><br>Save before running a command');
    return false;
  }
  try {
    await editor.save();
  } catch (error) {
    atom.notifications.addError('<strong>Could not save the file</strong>');
    return false;
  }
  filePath = file.path;
  let info = path.parse(filePath);
  dir = info.dir;
  name = info.name;
  return true;
}

function parseFilename(filename) {
  let re_full = /^(.+):(\d+):(\d+)$/;
  let re_line = /^(.+):(\d+)$/;
  let re_offset = /^(.+):\(.+\)$/;
  let match = null;
  if (match = filename.match(re_full)) {
    var name = match[1];
    var line = parseInt(match[2]);
    var column = parseInt(match[3]);
    var realname = `${path.parse(name).base}:${line}`;
  } else if (match = filename.match(re_line)) {
    var name = match[1];
    var line = parseInt(match[2]);
    var realname = `${path.parse(name).base}:${line}`;
  } else if (match = filename.match(re_offset)) {
    var name = match[1];
    var realname = path.parse(name).base;
  } else {
    var name = filename;
    var realname = path.parse(name).base;
  }
  return {
    name: name,
    line: line,
    column: column,
    realname: realname,
    open: async () => {
      try {
        if (path.parse(name).root) {
          await fsp.access(name);
          var editor = await atom.workspace.open(name);
        } else {
          let fullpath = path.join(dir, name);
          await fsp.access(fullpath);
          var editor = await atom.workspace.open(fullpath);
        }
        if (line) {
          if (!column) {
            column = editor.getBuffer().lineForRow(line - 1).search(/\S|$/) + 1;
          }
          editor.setCursorBufferPosition([line - 1, column - 1]);
        }
      } catch (e) {
        console.log(e);
        atom.notifications.addError('<strong>File sorgente non trovato</strong>');
      }
    }
  };
}

function parseErrors(log) {
  let messages = [];
  let re_compiler = /(.*):\s+(note|warning|error|fatal error):\s+(.*)/g;
  let re_linker = /(.*):\s+(undefined reference to.*|could not read symbols.*)/g;
  while (match = re_linker.exec(log)) {
    messages.push({
      file: parseFilename(match[1]),
      type: 'error',
      text: match[2],
    });
  }
  while (match = re_compiler.exec(log)) {
    messages.push({
      file: parseFilename(match[1]),
      type: match[2],
      text: match[3],
    });
  }
  return messages;
}

export async function build(e) {
  if (!await update(e)) return false;
  switch (fileType) {
    case 'C':
      var command = atom.config.get('borto-pack.cCompiler');
      var args = ['-o', path.join(dir, name), ...atom.config.get('borto-pack.cOptions').split(' '), filePath];
      break;
    case 'C++':
      var command = atom.config.get('borto-pack.cppCompiler');
      var args = ['-o', path.join(dir, name), ...atom.config.get('borto-pack.cppOptions').split(' '), filePath];
      break;
    default:
      atom.notifications.addError('<strong>Unrecognized file type</strong>');
      return false;
  }
  let options = {
    cwd: dir
  };
  return await new Promise((resolve, reject) => {
    child_process.execFile(command, args, options, async (error, stdout, stderr) => {
      stderr = String(stderr);
      if (stderr) {
        let messages = parseErrors(stderr);
        let compilerPanel = await atom.workspace.open(CompilerPanel.COMPILER_PANEL_URI);
        compilerPanel.setMessages(messages, stderr);
      } else {
        atom.workspace.hide(CompilerPanel.COMPILER_PANEL_URI)
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

export async function run(e) {
  if (!await update(e)) return false;
  let pyCompiler = atom.config.get('borto-pack.pyCompiler');
  switch (fileType) {
    case 'C':
    case 'C++':
      var exeFile = path.join(dir, name).concat(ext);
      var exeCommand = exeFile;
      break;
    case 'Python':
      var exeFile = filePath;
      var exeCommand = `${pyCompiler} ${exeFile}`;
      break;
    default:
      atom.notifications.addError('<strong>Unrecognized file type</strong>');
      return false;
  }
  try {
    await fsp.access(exeFile);
  } catch (e) {
    atom.notifications.addError('<strong>Executable file not found</strong>');
    return false;
  }
  let terminal = atom.config.get('borto-pack.terminal');
  switch (terminal) {
    case 'conhost':
      var command = `start "${name}" ${pyCompiler} ${loaderPath} ${exeCommand}`;
      break;
      break;
    case 'Windows Terminal':
      var command = `wt ${pyCompiler} ${loaderPath} ${exeCommand}`;
      break;
    case 'GNOME':
      var command = `gnome-terminal -t ${name} -- ${pyCompiler} ${loaderPath} ${exeCommand}`;
      break;
    case 'xterm':
      var command = `xterm  -T ${name} -e ${pyCompiler} ${loaderPath} ${exeCommand}`;
      break;
    case 'Konsole':
      var command = `konsole -e ${pyCompiler} ${loaderPath} ${exeCommand}`;
      break;
    case 'Xfce':
      var command = `xfce4-terminal -T ${name} --command "${pyCompiler} ${loaderPath} ${exeCommand}"`;
      break;
    case 'Pantheon':
      var command = `pantheon-terminal -e "${pyCompiler} ${loaderPath} ${exeCommand}"`;
      break;
    case 'URxvt':
      var command = `urxvt -e "${pyCompiler} ${loaderPath} ${exeCommand}"`;
      break;
  }
  let options = {
    cwd: dir
  };
  return await new Promise((resolve, reject) => {
    child_process.exec(command, options, error => {
      if (error) {
        atom.notifications.addError('<strong>Error while executing file</strong>');
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

export async function buildAndRun(e) {
  if (!await build(e)) return false;
  return await run(e);
}

export async function multiRun(e) {
  if (!await update(e)) return false;
  let args = [];
  switch (fileType) {
    case 'C':
    case 'C++':
      var exeFile = path.join(dir, name).concat(ext);
      var command = exeFile;
      break;
    case 'Python':
      var exeFile = filePath;
      var command = atom.config.get('borto-pack.pyCompiler');
      args = [exeFile];
      break;
    default:
      atom.notifications.addError('<strong>Unrecognized file type</strong>');
      return false;
  }
  let options = {
    cwd: dir
  };
  try {
    await fsp.access(exeFile);
  } catch (e) {
    atom.notifications.addError('<strong>Executable file not found</strong>');
    return false;
  }
  try {
    var inputFiles = await fsp.readdir(path.join(dir, 'input/'));
  } catch (e) {
    atom.notifications.addError(`<strong>Could not open 'input' directory</strong>`);
    return false;
  }
  let outputFolder = path.join(dir, 'output/');
  try {
    await fsp.readdir(outputFolder);
  } catch (e) {
    try {
      await fsp.mkdir(outputFolder);
    } catch (e) {
      atom.notifications.addError(`<strong>Could not open 'output' directory</strong>`);
      return false;
    }
  }
  var testcasePanel = await atom.workspace.open(TestcasePanel.TESTCASE_PANEL_URI);
  testcasePanel.clearTestcase();
  let timeLimit = atom.config.get('borto-pack.multiRunTimeout');
  for (let inputFile of inputFiles) {
    let match = /.*input[-_.]?(.+)\..+?$/.exec(inputFile) || /^(.+)\..+?$/.exec(inputFile);
    let title = 'Testcase'.concat(match ? ` #${match[1]}` : '');
    let streamInput = fs.createReadStream(path.join(dir, 'input', inputFile));
    let streamOutput = fs.createWriteStream(path.join(dir, 'output', inputFile.replace(/input/g, 'output').replace(/\.in$/, '.out')));
    let inputData = '';
    let outputData = '';
    let errorData = '';
    let child = child_process.spawn(command, args, options);
    let timestamp = Date.now();
    let id = getUniqueId();
    let timeLimitExceeded = false;
    if (timeLimit > 0) {
      setTimeout(() => {
        timeLimitExceeded = true;
        child.kill();
      }, timeLimit);
    }
    testcasePanel.addTestcase(id, title, () => {
      child.kill();
    });
    pump(streamInput, through((chunk, enc, callback) => {
        inputData = (inputData + chunk).slice(0, 512);
        callback(null, chunk);
      }), child.stdin);
    pump(child.stdout, through((chunk, enc, callback) => {
        outputData = (outputData + chunk).slice(0, 512);
        callback(null, chunk);
      }), streamOutput);
    pump(child.stderr, through((chunk, enc, callback) => {
      errorData = (errorData + chunk).slice(0, 512);
      callback();
    }));
    child.on('exit', (code, signal) => {
      let time = ((Date.now() - timestamp) / 1000).toFixed(2) + 's';
      if (timeLimitExceeded) {
        testcasePanel.resolveTestcase(id, inputData, outputData, 'TLE', 'error');
      } else if (signal || code) {
        testcasePanel.resolveTestcase(id, inputData, errorData, signal || 'RTE', 'error');
      } else {
        testcasePanel.resolveTestcase(id, inputData, outputData, time, 'success');
      }
    });
  }
}

export async function beautify(e) {
  if (!await update(e)) return false;
  switch (fileType) {
    case 'C':
    case 'C++':
      var command = 'clang-format';
      var args = ['-i', filePath, '-style',
        `{BasedOnStyle: ${atom.config.get('borto-pack.cppBeautify')}, IndentWidth: ${tabLength}, AllowShortIfStatementsOnASingleLine: true}`
      ];
      break;
    case 'Python':
      var command = 'yapf';
      var args = ['-i', filePath, '--style',
        `{based_on_style: ${atom.config.get('borto-pack.pyBeautify')}, indent_width: ${tabLength}}`
      ];
      break;
    default:
      atom.notifications.addError('<strong>Unrecognized file type</strong>');
      return false;
  }
  return await new Promise((resolve, reject) => {
    child_process.execFile(command, args, error => {
      if (error) {
        atom.notifications.addError(`<strong>Unable to beautify current file</strong>`);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

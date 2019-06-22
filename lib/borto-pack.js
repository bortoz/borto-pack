'use strict';

const child_process = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  CompositeDisposable
} = require('atom');

module.exports = {
  activate() {
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(atom.commands.add('atom-text-editor', {
      'borto-pack:build': compile,
      'borto-pack:build-and-run': compile,
      'borto-pack:run': exec,
      'borto-pack:multi-run': multiExec,
      'borto-pack:beautify': beautify,
    }));
  },
  config: {
    cppCompiler: {
      title: 'C++ Compiler',
      description: 'C++ Compiler Command',
      type: 'string',
      default: 'g++',
      order: 1,
    },
    cppOptions: {
      title: 'C++ Compiler Options',
      description: 'C++ Compiler Command Line Options',
      type: 'string',
      default: '-Wall -Wextra',
      order: 2,
    },
    cppBeautify: {
      title: 'C++ Beautifier (based on clang-format)',
      description: 'C++ Beautifier Style',
      type: 'string',
      enum: ['LLVM', 'Google', 'Chromium', 'Mozilla', 'WebKit'],
      default: 'LLVM',
      order: 3,
    },
    pyCompiler: {
      title: 'Python Interpreter',
      description: 'Python Interpreter Command',
      type: 'string',
      default: process.platfrom === 'win32' ? 'py' : 'python3',
      order: 4,
    },
    pyBeautify: {
      title: 'Python Beautifier (based on yapf)',
      description: 'Python Beautifier Style',
      type: 'string',
      enum: ['pep8', 'Google', 'Chromium', 'Facebook'],
      default: 'pep8',
      order: 5,
    },
    javaCompiler: {
      title: 'Java Compiler',
      description: 'Java Compiler Command',
      type: 'string',
      default: 'javac',
      order: 6,
    },
    rustCompiler: {
      title: 'Rust Compiler',
      description: 'Rust Compiler Command',
      type: 'string',
      default: 'rustc',
      order: 7,
    },
  },
  deactivate() {
    this.subscriptions.dispose();
  },
  subscriptions: null
};

function compile(e) {
  let editor = atom.workspace.getActiveTextEditor();
  let file = editor.getBuffer().file;
  let fileType = editor.getGrammar().name;
  if (!file) {
    atom.notifications.addError('<strong>File not found</strong><br/>Save before compiling');
  } else {
    editor.save().then(() => {
      let filePath = file.path;
      let info = path.parse(filePath);
      let command, args;
      if (fileType === 'C++') {
        command = atom.config.get('borto-pack.cppCompiler');
        args = ['-o', path.join(info.dir, info.name), ...atom.config.get('borto-pack.cppOptions').split(' '), filePath];
      } else if (fileType === 'Java') {
        command = atom.config.get('borto-pack.javaCompiler');
        args = ['-g', filePath];
      } else if (fileType === 'Rust') {
        command = atom.config.get('borto-pack.rustCompiler');
        args = ['-o', path.join(info.dir, info.name), filePath];
      }
      if (command) {
        let options = {
          cwd: info.dir,
        };
        let child = child_process.execFile(command, args, (error, stdout, stderr) => {
          stderr = String(stderr);
          if (error) {
            let options = {
              detail: stderr,
              dismissable: true,
            };
            atom.notifications.addError('<strong>Compilation failed</strong>', options);
          } else {
            if (stderr.length === 0) {
              atom.notifications.addSuccess('<strong>Compilation successful</strong>');
            } else {
              let options = {
                detail: stderr,
              };
              atom.notifications.addWarning('<strong>Compilation successful</strong>', options);
            }
            if (e.type === 'borto-pack:build-and-run') {
              exec();
            }
          }
        });
      } else {
        atom.notifications.addError('<strong>Unrecognized file type</strong>');
      }
    }, () => {
      atom.notifications.addError('<strong>Could not save the file</strong>');
    });
  }
}

function exec() {
  let editor = atom.workspace.getActiveTextEditor();
  let file = editor.getBuffer().file;
  let fileType = editor.getGrammar().name;
  if (!file) {
    atom.notifications.addError('<strong>File not found</strong><br/>Save before running');
  } else {
    editor.save().then(() => {
      let filePath = file.path;
      let info = path.parse(filePath);
      let ext = process.platform === 'win32' ? '.exe' : '';
      let pyCompiler = atom.config.get('borto-pack.pyCompiler');
      let exeFile, exeCommand;
      if (fileType === 'C++') {
        exeFile = path.join(info.dir, info.name).concat(ext);
        exeCommand = exeFile;
      } else if (fileType === 'Python') {
        exeFile = filePath;
        exeCommand = `${pyCompiler} ${exeFile}`
      } else if (fileType === 'Java') {
        exeFile = path.join(info.dir, info.name).concat('.class');
        exeCommand = `java ${info.name}`;
      } else if (fileType === 'Rust') {
        exeFile = path.join(info.dir, info.name).concat(ext);
        exeCommand = exeFile;
      }
      if (!exeFile) {
        atom.notifications.addError('<strong>Unrecognized file type</strong>');
      } else if (!fs.existsSync(exeFile)) {
        atom.notifications.addError('<strong>Executable file not found</strong>');
      } else {
        let loaderPath = path.join(__dirname, 'loader.py');
        let command;
        if (process.platform === 'win32') {
          command = `start "${info.name}" cmd.exe /C ${pyCompiler} ${loaderPath} ${exeCommand}`;
        } else if (process.platform === 'linux') {
          command = `gnome-terminal -t ${info.name} -- ${pyCompiler} ${loaderPath} ${exeCommand}`;
        }
        if (!command) {
          atom.notifications.addError('<strong>Unsupported platform</strong>');
        } else {
          let options = {
            cwd: info.dir,
          };
          try {
            let child = child_process.exec(command, options);
          } catch (error) {
            let options = {
              dismissable: true,
            };
            atom.notifications.addWarning(`<strong>Error while executing file</strong>`, options);
          }
        }
      }
    }, () => {
      atom.notifications.addError('<strong>Could not save the file</strong>');
    });
  }
}

function multiExec() {
  let editor = atom.workspace.getActiveTextEditor();
  let file = editor.getBuffer().file;
  if (!file) {
    atom.notifications.addError('<strong>File not found</strong><br/>Save before running');
  } else {
    editor.save().then(() => {
      let filePath = file.path;
      let info = path.parse(filePath);
      let fileType = editor.getGrammar().name;
      let pyCompiler = atom.config.get('borto-pack.pyCompiler');
      let ext = process.platform === 'win32' ? '.exe' : '';
      let exeFile, command, args = [];
      if (fileType === 'C++') {
        exeFile = path.join(info.dir, info.name).concat(ext);
        command = exeFile;
      } else if (fileType === 'Python') {
        exeFile = filePath;
        command = pyCompiler;
        args = [exeFile];
      } else if (fileType === 'Java') {
        exeFile = path.join(info.dir, info.name).concat('.class');
        command = 'java';
        args = [info.name];
      } else if (fileType === 'Rust') {
        exeFile = path.join(info.dir, info.name).concat(ext);
        command = exeFile;
      }
      if (!exeFile) {
        atom.notifications.addError('<strong>Unrecognized file type</strong>');
      } else if (!fs.existsSync(exeFile)) {
        atom.notifications.addError('<strong>Executable file not found</strong>');
      } else {
        fs.readdirSync(info.dir).filter((file) => /^input.*\.txt$/.test(file)).forEach((inputFile) => {
          let inputPath = path.join(info.dir, inputFile);
          let outputFile = inputFile.replace('input', 'output');
          let outputPath = path.join(info.dir, outputFile);
          let input = fs.readFileSync(inputPath);
          let childOptions = {
            cwd: info.dir,
          };
          let notificationOptions = {
            dismissable: true,
            buttons: [{
              text: 'Terminate process',
              onDidClick: () => {
                child.kill('SIGINT');
              },
            }],
          }
          let notification = atom.notifications.addInfo(`<strong>Running on: ${inputFile}</strong>`, notificationOptions);
          let child = child_process.execFile(command, args, childOptions, (error, stdout) => {
            notification.dismiss();
            if (error) {
              if (error.signal === 'SIGTERM') {
                atom.notifications.addError(`<strong>Time Limit Exceeded on: ${inputFile}</strong>`);
              } else if (error.signal === 'SIGINT') {
                atom.notifications.addError(`<strong>Process killed on: ${inputFile}</strong>`);
              } else {
                atom.notifications.addError(`<strong>Runtime Error on: ${inputFile}</strong>`);
              }
            } else {
              fs.writeFileSync(outputPath, stdout);
              atom.notifications.addSuccess(`<strong>Successful run on: ${inputFile}</strong>`);
            }
          });
          child.stdin.write(input);
          child.stdin.end();
        });
      }
    }, () => {
      atom.notifications.addError('<strong>Could not save the file</strong>');
    });
  }
}

function beautify() {
  let editor = atom.workspace.getActiveTextEditor();
  let fileType = editor.getGrammar().name;
  let file = editor.getBuffer().file;
  if (!file) {
    atom.notifications.addError('<strong>File not found</strong><br/>Save before running');
  } else {
    editor.save().then(() => {
      let filePath = file.path;
      let command;
      if (fileType === 'C++') {
        command = `clang-format -style "{BasedOnStyle: ${atom.config.get('borto-pack.cppBeautify')}, IndentWidth: ${editor.getTabLength()}}" -i ${filePath}`;
      } else if (fileType === 'Python') {
        command = `yapf --style "{based_on_style: ${atom.config.get('borto-pack.pyBeautify')}, indent_width: ${editor.getTabLength()}}" -i ${filePath}`;
      } else if (fileType === 'JavaScript') {
        command = `js-beautify -rns ${editor.getTabLength()} ${filePath}`;
      }
      if (command) {
        let child = child_process.exec(command, (error) => {
          if (error) {
            let options = {
              dismissable: true,
            };
            atom.notifications.addError(`<strong>Unable to beautify current file</strong>`, options);
          }
        });
      } else {
        atom.notifications.addError('<strong>Unrecognized file type</strong>');
      }
    }, () => {
      atom.notifications.addError('<strong>Could not save the file</strong>');
    });
  }
}

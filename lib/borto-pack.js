'use strict';

const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  CompositeDisposable
} = require('atom');

module.exports = {
  activate() {
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(atom.commands.add('atom-text-editor', {
      'borto-pack:build': runCommand,
      'borto-pack:build-and-run': runCommand,
      'borto-pack:debug': runCommand,
      'borto-pack:run': runCommand,
      'borto-pack:multi-run': runCommand,
      'borto-pack:beautify': runCommand,
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
    cppDebugger: {
      title: 'C++ Debugger',
      description: 'C++ Debugger Command',
      type: 'string',
      default: 'gdb',
      order: 3,
    },
    cppBeautify: {
      title: 'C++ Beautifier (based on clang-format)',
      description: 'C++ Beautifier Style',
      type: 'string',
      enum: ['LLVM', 'Google', 'Chromium', 'Mozilla', 'WebKit'],
      default: 'LLVM',
      order: 4,
    },
    pyCompiler: {
      title: 'Python Interpreter',
      description: 'Python Interpreter Command',
      type: 'string',
      default: process.platfrom === 'win32' ? 'py' : 'python3',
      order: 5,
    },
    pyBeautify: {
      title: 'Python Beautifier (based on yapf)',
      description: 'Python Beautifier Style',
      type: 'string',
      enum: ['pep8', 'Google', 'Chromium', 'Facebook'],
      default: 'pep8',
      order: 6,
    },
    javaCompiler: {
      title: 'Java Compiler',
      description: 'Java Compiler Command',
      type: 'string',
      default: 'javac',
      order: 7,
    },
    rustCompiler: {
      title: 'Rust Compiler',
      description: 'Rust Compiler Command',
      type: 'string',
      default: 'rustc',
      order: 8,
    },
  },
  deactivate() {
    this.subscriptions.dispose();
  },
  subscriptions: null
};

let Package = new class {
  constructor() {
    this.ext = process.platform === 'win32' ? '.exe' : '';
    this.loaderPath = path.join(__dirname, 'loader.py');
  }

  update() {
    return new Promise((resolve, reject) => {
      this.editor = atom.workspace.getActiveTextEditor();
      this.fileType = this.editor.getGrammar().name;
      this.file = this.editor.getBuffer().file;
      if (!this.file) {
        atom.notifications.addError('<strong>File not found</strong><br/>Save before running a command');
        reject('File not found');
      } else {
        this.editor.save().then(() => {
          this.filePath = this.file.path;
          this.info = path.parse(this.filePath);
          this.dir = this.info.dir;
          this.name = this.info.name;
          resolve();
        }, (error) => {
          atom.notifications.addError('<strong>Could not save the file</strong>');
          reject(error);
        });
      }
    });
  }

  compile(command, args, options) {
    return new Promise((resolve, reject) => {
      child_process.execFile(command, args, options, (error, stdout, stderr) => {
        stderr = String(stderr);
        if (error) {
          let options = {
            detail: stderr,
            dismissable: true,
          };
          atom.notifications.addError('<strong>Compilation failed</strong>', options);
          reject(error);
        } else {
          if (stderr.length === 0) {
            atom.notifications.addSuccess('<strong>Compilation successful</strong>');
          } else {
            let options = {
              detail: stderr,
            };
            atom.notifications.addWarning('<strong>Compilation successful</strong>', options);
          }
          resolve();
        }
      });
    });
  }

  build() {
    return this.update().then(() => {
      return new Promise((resolve, reject) => {
        let command, args;
        switch (this.fileType) {
          case 'C++':
            command = atom.config.get('borto-pack.cppCompiler');
            args = ['-o', path.join(this.dir, this.name), ...atom.config.get('borto-pack.cppOptions').split(' '), this.filePath];
            break;
          case 'Java':
            command = atom.config.get('borto-pack.javaCompiler');
            args = ['-g', this.filePath];
            break;
          case 'Rust':
            command = atom.config.get('borto-pack.rustCompiler');
            args = ['-o', path.join(this.dir, this.name), this.filePath];
            break;
        }
        let options = {
          cwd: this.dir,
        };
        if (command) {
          this.compile(command, args, options).then(resolve, reject);
        } else {
          atom.notifications.addError('<strong>Unrecognized file type</strong>');
          reject('Unrecognized file type');
        }
      });
    });
  }

  run() {
    return this.update().then(() => {
      return new Promise((resolve, reject) => {
        let pyCompiler = atom.config.get('borto-pack.pyCompiler');
        let exeFile, exeCommand;
        switch (this.fileType) {
          case 'C++':
            exeFile = path.join(this.dir, this.name).concat(this.ext);
            exeCommand = exeFile;
            break;
          case 'Python':
            exeFile = this.filePath;
            exeCommand = `${pyCompiler} ${exeFile}`;
            break;
          case 'Java':
            exeFile = path.join(this.dir, this.name).concat('.class');
            exeCommand = `java ${this.name}`;
            break;
          case 'Rust':
            exeFile = path.join(this.dir, this.name).concat(this.ext);
            exeCommand = exeFile;
            break;
        }
        if (!exeFile) {
          atom.notifications.addError('<strong>Unrecognized file type</strong>');
          reject('Unrecognized file type');
        } else if (!fs.existsSync(exeFile)) {
          atom.notifications.addError('<strong>Executable file not found</strong>');
          reject('Executable file not found');
        } else {
          let command;
          if (process.platform === 'win32') {
            command = `start "${this.name}" cmd.exe /C ${pyCompiler} ${this.loaderPath} ${exeCommand}`;
          } else if (process.platform === 'linux') {
            command = `gnome-terminal -t ${this.name} -- ${pyCompiler} ${this.loaderPath} ${exeCommand}`;
          }
          if (!command) {
            atom.notifications.addError('<strong>Unsupported platform</strong>');
            reject('Unsupported platform');
          } else {
            let options = {
              cwd: this.dir,
            };
            let child = child_process.exec(command, options, (error) => {
              if (error) {
                let options = {
                  dismissable: true,
                };
                atom.notifications.addWarning(`<strong>Error while executing file</strong>`, options);
                reject(error);
              } else {
                resolve();
              }
            });
          }
        }
      });
    });
  }

  buildAndRun() {
    return this.build().then(() => this.run());
  }

  multiRun() {
    return this.update().then(() => {
      return new Promise((resolve, reject) => {
        let exeFile, command, args = [];
        switch (this.fileType) {
          case 'C++':
            exeFile = path.join(this.dir, this.name).concat(this.ext);
            command = exeFile;
            break;
          case 'Python':
            exeFile = this.filePath;
            command = this.pyCompiler;
            args = [exeFile];
            break;
          case 'Java':
            exeFile = path.join(this.dir, this.name).concat('.class');
            command = 'java';
            args = [this.name];
            break;
          case 'Rust':
            exeFile = path.join(this.dir, this.name).concat(this.ext);
            command = exeFile;
            break;
        }
        if (!exeFile) {
          atom.notifications.addError('<strong>Unrecognized file type</strong>');
          rejetc('Unrecognized file type');
        } else if (!fs.existsSync(exeFile)) {
          atom.notifications.addError('<strong>Executable file not found</strong>');
          rejetc('Executable file not found');
        } else {
          let inputFiles = fs.readdirSync(this.dir).filter((file) => /^input.*\.txt$/.test(file));
          Promise.all(inputFiles.map((inputFile) => {
            return new Promise((resolve) => {
              let inputPath = path.join(this.dir, inputFile);
              let outputFile = inputFile.replace('input', 'output');
              let outputPath = path.join(this.dir, outputFile);
              let input = fs.readFileSync(inputPath);
              let childOptions = {
                cwd: this.dir,
              };
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
                resolve();
              });
              child.stdin.write(input);
              child.stdin.end();
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
            });
          })).then(resolve);
        }
      });
    });
  }

  beautify() {
    return this.update().then(() => {
      return new Promise((resolve, reject) => {
        let command;
        switch (this.fileType) {
          case 'C++':
            command = `clang-format -style "{BasedOnStyle: ${atom.config.get('borto-pack.cppBeautify')}, IndentWidth: ${this.editor.getTabLength()}}" -i ${this.filePath}`;
            break;
          case 'Python':
            command = `yapf --style "{based_on_style: ${atom.config.get('borto-pack.pyBeautify')}, indent_width: ${this.editor.getTabLength()}}" -i ${this.filePath}`;
            break;
          case 'JavaScript':
            command = `js-beautify -rns ${this.editor.getTabLength()} ${this.filePath}`;
            break;
        }
        if (command) {
          let child = child_process.exec(command, (error) => {
            if (error) {
              let options = {
                dismissable: true,
              };
              atom.notifications.addError(`<strong>Unable to beautify current file</strong>`, options);
              reject(error);
            } else {
              resolve();
            }
          });
        } else {
          atom.notifications.addError('<strong>Unrecognized file type</strong>');
          reject('Unrecognized file type');
        }
      });
    });
  }
}

let debugMode = false;

function runCommand(e) {
  let method = e.type.slice(11).replace(/-\w+/g, (s) => s.charAt(1).toUpperCase() + s.slice(2));
  eval(`Package.${method}()`).catch((error) => {
    if (debugMode) {
      console.log(error);
    }
  });
}

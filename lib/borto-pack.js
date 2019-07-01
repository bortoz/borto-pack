/** @babel */

import { CompositeDisposable } from 'atom';
import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import TestcasePanel from './views/testcase-panel';
import TestcaseRunner from './testcase-runner';

export default class BortoPackage {
  debugMode = false;

  constructor() {
    this.ext = process.platform === 'win32' ? '.exe' : '';
    this.loaderPath = path.join(__dirname, 'loader.py');
  }

  async update() {
    this.editor = atom.workspace.getActiveTextEditor();
    this.fileType = this.editor.getGrammar().name;
    this.file = this.editor.getBuffer().file;
    if (!this.file) {
      atom.notifications.addError('<strong>File not found</strong><br>Save before running a command');
      throw 'File not found';
    }
    try {
      await this.editor.save();
    } catch (error) {
      atom.notifications.addError('<strong>Could not save the file</strong>');
      throw error;
    }
    this.filePath = this.file.path;
    this.info = path.parse(this.filePath);
    this.dir = this.info.dir;
    this.name = this.info.name;
  }

  async build() {
    await this.update();
    switch (this.fileType) {
      case 'C++':
        var command = atom.config.get('borto-pack.cppCompiler');
        var args = ['-o', path.join(this.dir, this.name), ...atom.config.get('borto-pack.cppOptions').split(' '), this.filePath];
        break;
      case 'Java':
        var command = atom.config.get('borto-pack.javaCompiler');
        var args = ['-g', this.filePath];
        break;
      case 'Rust':
        var command = atom.config.get('borto-pack.rustCompiler');
        var args = ['-o', path.join(this.dir, this.name), this.filePath];
        break;
      default:
        atom.notifications.addError('<strong>Unrecognized file type</strong>');
        throw 'Unrecognized file type';
    }
    let options = {
      cwd: this.dir
    };
    await new Promise((resolve, reject) => {
      child_process.execFile(command, args, options, (error, stdout, stderr) => {
        stderr = String(stderr);
        if (error) {
          let options = {
            detail: stderr,
            dismissable: true
          };
          atom.notifications.addError('<strong>Compilation failed</strong>', options);
          reject(error);
        } else {
          if (stderr.length === 0) {
            atom.notifications.addSuccess('<strong>Compilation successful</strong>');
          } else {
            let options = {
              detail: stderr
            };
            atom.notifications.addWarning('<strong>Compilation successful</strong>', options);
          }
          resolve();
        }
      });
    });
  }

  async run() {
    await this.update();
    let pyCompiler = atom.config.get('borto-pack.pyCompiler');
    switch (this.fileType) {
      case 'C++':
        var exeFile = path.join(this.dir, this.name).concat(this.ext);
        var exeCommand = exeFile;
        break;
      case 'Python':
        var exeFile = this.filePath;
        var exeCommand = `${pyCompiler} ${exeFile}`;
        break;
      case 'Java':
        var exeFile = path.join(this.dir, this.name).concat('.class');
        var exeCommand = `java ${this.name}`;
        break;
      case 'Rust':
        var exeFile = path.join(this.dir, this.name).concat(this.ext);
        var exeCommand = exeFile;
        break;
      default:
        atom.notifications.addError('<strong>Unrecognized file type</strong>');
        throw 'Unrecognized file type';
    }
    await new Promise((resolve, reject) => {
      fs.access(exeFile, error => {
        if (error) {
          atom.notifications.addError('<strong>Executable file not found</strong>');
          reject('Executable file not found');
        } else {
          resolve();
        }
      });
    });
    if (process.platform === 'win32') {
      var command = `start "${this.name}" cmd.exe /C ${pyCompiler} ${this.loaderPath} ${exeCommand}`;
    } else if (process.platform === 'linux') {
      var command = `gnome-terminal -t ${this.name} -- ${pyCompiler} ${this.loaderPath} ${exeCommand}`;
    } else {
      atom.notifications.addError('<strong>Unsupported platform</strong>');
      throw 'Unsupported platform';
    }
    let options = {
      cwd: this.dir
    };
    await new Promise((resolve, reject) => {
      child_process.exec(command, options, error => {
        if (error) {
          let options = {
            dismissable: true
          };
          atom.notifications.addError('<strong>Error while executing file</strong>', options);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async buildAndRun() {
    await this.build();
    await this.run();
  }

  async multiRun() {
    await this.update();
    let args = [];
    switch (this.fileType) {
      case 'C++':
        var exeFile = path.join(this.dir, this.name).concat(this.ext);
        var command = exeFile;
        break;
      case 'Python':
        var exeFile = this.filePath;
        var command = atom.config.get('borto-pack.pyCompiler');
        args = [exeFile];
        break;
      case 'Java':
        var exeFile = path.join(this.dir, this.name).concat('.class');
        var command = 'java';
        args = [this.name];
        break;
      case 'Rust':
        var exeFile = path.join(this.dir, this.name).concat(this.ext);
        var command = exeFile;
        break;
      default:
        atom.notifications.addError('<strong>Unrecognized file type</strong>');
        throw 'Unrecognized file type';
    }
    let options = {
      cwd: this.dir
    };
    await new Promise((resolve, reject) => {
      fs.access(exeFile, error => {
        if (error) {
          atom.notifications.addError('<strong>Executable file not found</strong>');
          reject('Executable file not found');
        } else {
          resolve();
        }
      });
    });
    let inputFolder = path.join(this.dir, 'input/');
    let inputFiles = await new Promise((resolve, reject) => {
      fs.readdir(inputFolder, (error, files) => {
        if (error) {
          atom.notifications.addError(`<strong>Could not open 'input' directory</strong>`);
          reject(error);
        } else {
          resolve(files);
        }
      });
    });
    let outputFolder = path.join(this.dir, 'output/');
    await new Promise((resolve, reject) => {
      fs.access(outputFolder, error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    }).catch(() => {
      return new Promise((resolve, reject) => {
        fs.mkdir(outputFolder, error => {
          if (error) {
            atom.notifications.addError(`<strong>Could not open 'output' directory</strong>`);
            reject(error);
          } else {
            resolve();
          }
        });
      });
    });
    if (this.processDisposables) {
      this.processDisposables.dispose();
    }
    this.processDisposables = new CompositeDisposable();
    let testcasePanel = atom.workspace.paneForURI(TestcasePanel.TESTCASE_PANEL_URI);
    if (testcasePanel) {
      testcasePanel.activeItem.clearTestcase();
    }
    inputFiles.forEach(async inputFile => {
      this.processDisposables.add(new TestcaseRunner(inputFile, this.dir, command, args, options));
    });
  }

  async multiBuildAndRun() {
    await this.build();
    await this.multiRun();
  }

  async beautify() {
    await this.update();
    switch (this.fileType) {
      case 'C++':
        var command = `clang-format -style "{BasedOnStyle: ${atom.config.get('borto-pack.cppBeautify')}, IndentWidth: ${this.editor.getTabLength()}}" -i ${this.filePath}`;
        break;
      case 'Python':
        var command = `yapf --style "{based_on_style: ${atom.config.get('borto-pack.pyBeautify')}, indent_width: ${this.editor.getTabLength()}}" -i ${this.filePath}`;
        break;
      default:
        atom.notifications.addError('<strong>Unrecognized file type</strong>');
        throw 'Unrecognized file type';
    }
    await new Promise((resolve, reject) => {
      child_process.exec(command, error => {
        if (error) {
          atom.notifications.addError(`<strong>Unable to beautify current file</strong>`);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  switchDebugMode() {
    this.debugMode = !this.debugMode;
  }
}

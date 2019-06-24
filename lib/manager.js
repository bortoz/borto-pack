"use babel";

import child_process from "child_process";
import fs from "fs";
import path from "path";

export default class Manager {
  constructor() {
    this.ext = process.platform === "win32" ? ".exe" : "";
    this.loaderPath = path.join(__dirname, "loader.py");
  }

  async update() {
    this.editor = atom.workspace.getActiveTextEditor();
    this.fileType = this.editor.getGrammar().name;
    this.file = this.editor.getBuffer().file;
    if (!this.file) {
      atom.notifications.addError("<strong>File not found</strong>Save before running a command");
      throw "File not found";
    }
    try {
      await this.editor.save();
    } catch (error) {
      atom.notifications.addError("<strong>Could not save the file</strong>");
      throw error;
    }
    this.filePath = this.file.path;
    this.info = path.parse(this.filePath);
    this.dir = this.info.dir;
    this.name = this.info.name;
  }

  async build() {
    await this.update();
    let command, args;
    switch (this.fileType) {
      case "C++":
        command = atom.config.get("borto-pack.cppCompiler");
        args = ["-o", path.join(this.dir, this.name), ...atom.config.get("borto-pack.cppOptions").split(" "), this.filePath];
        break;
      case "Java":
        command = atom.config.get("borto-pack.javaCompiler");
        args = ["-g", this.filePath];
        break;
      case "Rust":
        command = atom.config.get("borto-pack.rustCompiler");
        args = ["-o", path.join(this.dir, this.name), this.filePath];
        break;
    }
    if (!command) {
      atom.notifications.addError("<strong>Unrecognized file type</strong>");
      throw "Unrecognized file type";
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
          atom.notifications.addError("<strong>Compilation failed</strong>", options);
          reject(error);
        } else {
          if (stderr.length === 0) {
            atom.notifications.addSuccess("<strong>Compilation successful</strong>");
          } else {
            let options = {
              detail: stderr
            };
            atom.notifications.addWarning("<strong>Compilation successful</strong>", options);
          }
          resolve();
        }
      });
    });
  }

  async run() {
    await this.update();
    let pyCompiler = atom.config.get("borto-pack.pyCompiler");
    let exeFile, exeCommand;
    switch (this.fileType) {
      case "C++":
        exeFile = path.join(this.dir, this.name).concat(this.ext);
        exeCommand = exeFile;
        break;
      case "Python":
        exeFile = this.filePath;
        exeCommand = `${pyCompiler} ${exeFile}`;
        break;
      case "Java":
        exeFile = path.join(this.dir, this.name).concat(".class");
        exeCommand = `java ${this.name}`;
        break;
      case "Rust":
        exeFile = path.join(this.dir, this.name).concat(this.ext);
        exeCommand = exeFile;
        break;
    }
    if (!exeFile) {
      atom.notifications.addError("<strong>Unrecognized file type</strong>");
      throw "Unrecognized file type";
    }
    if (!fs.existsSync(exeFile)) {
      atom.notifications.addError("<strong>Executable file not found</strong>");
      throw "Executable file not found";
    }
    let command;
    if (process.platform === "win32") {
      command = `start "${this.name}" cmd.exe /C ${pyCompiler} ${this.loaderPath} ${exeCommand}`;
    } else if (process.platform === "linux") {
      command = `gnome-terminal -t ${this.name} -- ${pyCompiler} ${this.loaderPath} ${exeCommand}`;
    }
    if (!command) {
      atom.notifications.addError("<strong>Unsupported platform</strong>");
      throw "Unsupported platform";
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
          atom.notifications.addError("<strong>Error while executing file</strong>", options);
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
    let exeFile,
      command,
      args = [];
    switch (this.fileType) {
      case "C++":
        exeFile = path.join(this.dir, this.name).concat(this.ext);
        command = exeFile;
        break;
      case "Python":
        exeFile = this.filePath;
        command = atom.config.get("borto-pack.pyCompiler");
        args = [exeFile];
        break;
      case "Java":
        exeFile = path.join(this.dir, this.name).concat(".class");
        command = "java";
        args = [this.name];
        break;
      case "Rust":
        exeFile = path.join(this.dir, this.name).concat(this.ext);
        command = exeFile;
        break;
    }
    if (!exeFile) {
      atom.notifications.addError("<strong>Unrecognized file type</strong>");
      throw "Unrecognized file type";
    }
    if (!fs.existsSync(exeFile)) {
      atom.notifications.addError("<strong>Executable file not found</strong>");
      throw "Executable file not found";
    }
    fs.readdirSync(this.dir)
      .filter(file => /^input.*\.txt$/.test(file))
      .forEach(inputFile => {
        let inputPath = path.join(this.dir, inputFile);
        let outputFile = inputFile.replace("input", "output");
        let outputPath = path.join(this.dir, outputFile);
        let input = fs.readFileSync(inputPath);
        let childOptions = {
          cwd: this.dir
        };
        let child = child_process.execFile(command, args, childOptions, (error, stdout) => {
          notification.dismiss();
          if (error) {
            if (error.signal === "SIGTERM") {
              atom.notifications.addError(`<strong>Time Limit Exceeded on: ${inputFile}</strong>`);
            } else if (error.signal === "SIGINT") {
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
        let notificationOptions = {
          dismissable: true,
          buttons: [{
              text: "Terminate process",
              onDidClick() {
                child.kill("SIGINT");
              }
          }]
        };
        let notification = atom.notifications.addInfo(`<strong>Running on: ${inputFile}</strong>`, notificationOptions);
      });
  }

  async beautify() {
    await this.update();
    let command;
    switch (this.fileType) {
      case "C++":
        command = `clang-format -style "{BasedOnStyle: ${atom.config.get("borto-pack.cppBeautify")}, IndentWidth: ${this.editor.getTabLength()}}" -i ${this.filePath}`;
        break;
      case "Python":
        command = `yapf --style "{based_on_style: ${atom.config.get("borto-pack.pyBeautify")}, indent_width: ${this.editor.getTabLength()}}" -i ${this.filePath}`;
        break;
      case "JavaScript":
        command = `js-beautify -rns ${this.editor.getTabLength()} ${this.filePath}`;
        break;
    }
    if (!command) {
      atom.notifications.addError("<strong>Unrecognized file type</strong>");
      throw "Unrecognized file type";
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
}

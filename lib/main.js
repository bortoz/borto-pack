/** @babel */

import { CompositeDisposable } from 'atom';
import BortoPackage from './borto-pack';
import TestcasePanel from './views/testcase-panel';

export default {
  activate() {
    this.disposables = new CompositeDisposable();
    this.disposables.add(
      atom.commands.add('atom-text-editor', {
        'borto-pack:build': e => this.runCommand(e),
        'borto-pack:build-and-run': e => this.runCommand(e),
        'borto-pack:run': e => this.runCommand(e),
        'borto-pack:multi-run': e => this.runCommand(e),
        'borto-pack:beautify': e => this.runCommand(e),
        'borto-pack:switch-debug-mode': e => this.runCommand(e)
      })
    );
    this.disposables.add(
      atom.workspace.addOpener(uri => {
        if (uri === TestcasePanel.TESTCASE_PANEL_URI) {
          return new TestcasePanel({ testcases: [] });
        }
      })
    );
    this.bortoPack = new BortoPackage();
  },

  deactivate() {
    if (this.disposables) {
      this.disposables.dispose();
    }
    delete this.disposables;
    delete this.bortoPack;
  },

  async runCommand(e) {
    let method = e.type.slice(11).replace(/-(.)([^-]*)/g, (s, a, b) => a.toUpperCase() + b);
    try {
      await Reflect.get(this.bortoPack, method).call(this.bortoPack);
    } catch (error) {
      if (this.bortoPack.debugMode) {
        if (typeof error === 'string') {
          console.log(error);
        } else {
          console.dir(error);
        }
      }
    }
  },

  config: {
    cppCompiler: {
      title: 'C++ Compiler',
      description: 'C++ Compiler Command',
      type: 'string',
      default: 'g++',
      order: 1
    },
    cppOptions: {
      title: 'C++ Compiler Options',
      description: 'C++ Compiler Command Line Options',
      type: 'string',
      default: '-Wall -Wextra',
      order: 2
    },
    cppBeautify: {
      title: 'C++ Beautifier (based on clang-format)',
      description: 'C++ Beautifier Style',
      type: 'string',
      enum: ['LLVM', 'Google', 'Chromium', 'Mozilla', 'WebKit'],
      default: 'LLVM',
      order: 3
    },
    pyCompiler: {
      title: 'Python Interpreter',
      description: 'Python Interpreter Command',
      type: 'string',
      default: process.platfrom === 'win32' ? 'py' : 'python3',
      order: 4
    },
    pyBeautify: {
      title: 'Python Beautifier (based on yapf)',
      description: 'Python Beautifier Style',
      type: 'string',
      enum: ['pep8', 'Google', 'Chromium', 'Facebook'],
      default: 'pep8',
      order: 5
    },
    javaCompiler: {
      title: 'Java Compiler',
      description: 'Java Compiler Command',
      type: 'string',
      default: 'javac',
      order: 6
    },
    rustCompiler: {
      title: 'Rust Compiler',
      description: 'Rust Compiler Command',
      type: 'string',
      default: 'rustc',
      order: 7
    }
  }
};

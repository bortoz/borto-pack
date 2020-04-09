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
          return new TestcasePanel();
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
      await this.bortoPack.update();
      await Reflect.get(this.bortoPack, method).call(this.bortoPack);
    } catch (error) {
      if (this.bortoPack.debugMode) {
        console.dir(error);
      }
    }
  },

  config: {
    cCompiler: {
      title: 'C Compiler',
      description: 'C Compiler Command',
      type: 'string',
      default: 'gcc',
      order: 1
    },
    cOptions: {
      title: 'C Compiler Options',
      description: 'C Compiler Command Line Options',
      type: 'string',
      default: '-Wall -Wextra',
      order: 2
    },
    cppCompiler: {
      title: 'C++ Compiler',
      description: 'C++ Compiler Command',
      type: 'string',
      default: 'g++',
      order: 3
    },
    cppOptions: {
      title: 'C++ Compiler Options',
      description: 'C++ Compiler Command Line Options',
      type: 'string',
      default: '-Wall -Wextra',
      order: 4
    },
    cppBeautify: {
      title: 'C++ Beautifier (based on clang-format)',
      description: 'C++ Beautifier Style',
      type: 'string',
      enum: ['LLVM', 'Google', 'Chromium', 'Mozilla', 'WebKit'],
      default: 'LLVM',
      order: 5
    },
    pyCompiler: {
      title: 'Python Interpreter',
      description: 'Python Interpreter Command',
      type: 'string',
      default: process.platfrom === 'win32' ? 'py' : 'python3',
      order: 6
    },
    pyBeautify: {
      title: 'Python Beautifier (based on yapf)',
      description: 'Python Beautifier Style',
      type: 'string',
      enum: ['pep8', 'Google', 'Chromium', 'Facebook'],
      default: 'pep8',
      order: 7
    },
    javaCompiler: {
      title: 'Java Compiler',
      description: 'Java Compiler Command',
      type: 'string',
      default: 'javac',
      order: 8
    },
    terminal: {
      title: 'Terminal',
      description: 'Terminal used to run a program',
      type: 'string',
      enum: process.platform.startsWith('win') ? ['conhost', 'Windows Terminal'] : ['GNOME', 'xterm', 'Konsole', 'Xfce', 'Pantheon', 'URxvt', 'MATE'],
      default: 'conhost',
      order: 9
    }
  }
};

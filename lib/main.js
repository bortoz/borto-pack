/** @babel */

import { CompositeDisposable } from 'atom';
import os from 'os';
import * as BortoPackage from './borto-pack';
import TestcasePanel from './views/testcase-panel';
import CompilerPanel from './views/compiler-panel';

export default {
  activate() {
    this.disposables = new CompositeDisposable();
    this.disposables.add(
      atom.commands.add('atom-text-editor', {
        'borto-pack:build': BortoPackage.build,
        'borto-pack:build-and-run': BortoPackage.buildAndRun,
        'borto-pack:run': BortoPackage.run,
        'borto-pack:multi-run': BortoPackage.multiRun,
        'borto-pack:beautify': BortoPackage.beautify
      }),
      atom.commands.add('atom-pane', {
        'borto-pack:copy': BortoPackage.copy,
        'borto-pack:search': BortoPackage.search
      }),
      atom.keymaps.add(__dirname, { 'atom-pane': {
        'ctrl-c': 'borto-pack:copy'
      }}, 1)
    );
    this.disposables.add(
      atom.workspace.addOpener(uri => {
        if (uri === TestcasePanel.TESTCASE_PANEL_URI) {
          return new TestcasePanel();
        } else if (uri === CompilerPanel.COMPILER_PANEL_URI) {
          return new CompilerPanel();
        }
      })
    );
  },

  deactivate() {
    this.disposables.dispose();
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
      title: 'C/C++ Beautifier (based on clang-format)',
      description: 'C/C++ Beautifier Style',
      type: 'string',
      enum: ['LLVM', 'Google', 'Chromium', 'Mozilla', 'WebKit'],
      default: 'LLVM',
      order: 5
    },
    cppBeautifyOptions: {
      title: 'C/C++ Beautifier options',
      description: 'C/C++ Beautifier options (JSON format)',
      type: 'string',
      default: '{}',
      order: 6
    },
    pyCompiler: {
      title: 'Python Interpreter',
      description: 'Python Interpreter Command',
      type: 'string',
      default: process.platform.startsWith('win') ? 'py' : 'python3',
      order: 7
    },
    pyBeautify: {
      title: 'Python Beautifier (based on yapf)',
      description: 'Python Beautifier Style',
      type: 'string',
      enum: ['pep8', 'Google', 'Chromium', 'Facebook'],
      default: 'pep8',
      order: 8
    },
    pyBeautifyOptions: {
      title: 'Python Beautifier options',
      description: 'Python Beautifier options (JSON format)',
      type: 'string',
      default: '{}',
      order: 9
    },
    terminal: {
      title: 'Terminal',
      description: 'Terminal used to run a program',
      type: 'string',
      enum: process.platform.startsWith('win') ? ['conhost', 'Windows Terminal'] : ['GNOME', 'xterm', 'Konsole', 'Xfce', 'Pantheon', 'URxvt'],
      default: process.platform.startsWith('win') ? 'conhost' : 'GNOME',
      order: 10
    },
    terminalProfile: {
      title: 'Terminal profile',
      description: 'Terminal profile (currently only supports WT, GNOME, Konsole)',
      type: 'string',
      default: '',
      order: 11
    },
    multiRunTimeout: {
      title: 'MultiRun Timeout',
      description: 'Timeout in milliseconds of multiRun command. A value of 0 indicates no timeout',
      type: 'integer',
      default: 0,
      minimum: 0,
      order: 12
    },
    multiRunWorker: {
      title: 'MultiRun Workers',
      description: 'Number of simultaneous processes used in multiRun command.',
      type: 'integer',
      default: os.cpus().length - 1,
      minimum: 1,
      maximum: os.cpus().length,
      order: 13
    },
    linter: {
      title: 'Linter',
      description: 'Visualize errors when compiling',
      type: 'integer',
      enum: [
        { value: 0, description: `Don't visualize`},
        { value: 1, description: 'Visualize only lines'},
        { value: 2, description: 'Visualize lines and columns'},
      ],
      default: 2,
      radio: true,
      order: 14
    }
  }
};

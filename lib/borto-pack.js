"use babel";

import { CompositeDisposable } from "atom";
import Manager from "./manager";

module.exports = {
  activate() {
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      atom.commands.add("atom-text-editor", {
        "borto-pack:build": runCommand,
        "borto-pack:build-and-run": runCommand,
        "borto-pack:run": runCommand,
        "borto-pack:multi-run": runCommand,
        "borto-pack:beautify": runCommand
      })
    );
  },
  config: {
    cppCompiler: {
      title: "C++ Compiler",
      description: "C++ Compiler Command",
      type: "string",
      default: "g++",
      order: 1
    },
    cppOptions: {
      title: "C++ Compiler Options",
      description: "C++ Compiler Command Line Options",
      type: "string",
      default: "-Wall -Wextra",
      order: 2
    },
    cppBeautify: {
      title: "C++ Beautifier (based on clang-format)",
      description: "C++ Beautifier Style",
      type: "string",
      enum: ["LLVM", "Google", "Chromium", "Mozilla", "WebKit"],
      default: "LLVM",
      order: 3
    },
    pyCompiler: {
      title: "Python Interpreter",
      description: "Python Interpreter Command",
      type: "string",
      default: process.platfrom === "win32" ? "py" : "python3",
      order: 4
    },
    pyBeautify: {
      title: "Python Beautifier (based on yapf)",
      description: "Python Beautifier Style",
      type: "string",
      enum: ["pep8", "Google", "Chromium", "Facebook"],
      default: "pep8",
      order: 5
    },
    javaCompiler: {
      title: "Java Compiler",
      description: "Java Compiler Command",
      type: "string",
      default: "javac",
      order: 6
    },
    rustCompiler: {
      title: "Rust Compiler",
      description: "Rust Compiler Command",
      type: "string",
      default: "rustc",
      order: 7
    }
  },
  deactivate() {
    this.subscriptions.dispose();
  },
  subscriptions: null
};

let manager = new Manager();
let debugMode = false;

async function runCommand(e) {
  let method = e.type.slice(11).replace(/-(.)([^-]*)/g, (s, a, b) => a.toUpperCase() + b);
  try {
    await Reflect.get(manager, method).call(manager);
  } catch (error) {
    if (debugMode) {
      console.log(error);
    }
  }
}

# Borto's Package

This package provides utilities to compile, run and beautify the code in C, C++ and Python.

## Feature

### Compiler error parser and linter

You can press <kbd>F6</kbd> to compile your code, if there are errors a panel with details will open.

![Compiler panel](https://github.com/bortoz/borto-pack/raw/master/img/compiler-panel.jpg)

There is also a linter feature to find errors quickly.

### Support of different terminals

You can press <kbd>F8</kbd> to run your code, you can choose and customize the terminal to use.

![Teminals](https://github.com/bortoz/borto-pack/raw/master/img/terminals.jpg)

### Running multiple inputs in parallel

By pressing <kbd>shift-F8</kbd>, your code will be executed on each file in the `input` folder.

![Testcase panel](https://github.com/bortoz/borto-pack/raw/master/img/testcase-panel.jpg)

## Installation

To compile and run the code you need to install the compiler and add it to your `PATH`.

| Language | Compilers        |
| :------- | ---------------- |
| C        | `gcc`, `clang`   |
| C++      | `g++`, `clang++` |
| Python   | `python`, `pypy` |

To beautify `python` code you need to install `yapf` beautifier.

## Usage

This package provides five different commands:

| Command                          |     Keybinding      | Use                                                                                                                  |
| :------------------------------- | :-----------------: | :------------------------------------------------------------------------------------------------------------------- |
| `borto-pack:beautify`            |    <kbd>F5</kbd>    | Beautify the current file.                                                                                           |
| `borto-pack:build`               |    <kbd>F6</kbd>    | Compile the current file.                                                                                            |
| `borto-pack:build-and-run`       |    <kbd>F7</kbd>    | Build current file and run the executable.                                                                           |
| `borto-pack:run`                 |    <kbd>F8</kbd>    | Run the executable file corresponding to the current file.                                                           |
| `borto-pack:multi-run`           | <kbd>shift-F8</kbd> | Run the executable file on each file in the directory `input` and saves the outputs in the directory `output`. |
| `borto-pack:debug`           | <kbd>shift-F7</kbd> | run gdb on the compild file. |


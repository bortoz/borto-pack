# Borto's Package

This package provides utilities to compile, run and beautify the code in C, C++ and Python.

# Installation

To compile and run the code you need to install the compiler and add it to your PATH.

| Language | Compilers        |
| :------- | ---------------- |
| C        | `gcc`, `clang`   |
| C++      | `g++`, `clang++` |
| Python   | `python`, `pypy` |

To beautify the code you need to install the beautifier.

| Language | Beautifiers    |
| :------- | -------------- |
| C or C++ | `clang-format` |
| Python   | `yapf`         |

# Usage

This package provides five different commands:

| Command                          |     Keybinding      | Use                                                                                                                  |
| :------------------------------- | :-----------------: | :------------------------------------------------------------------------------------------------------------------- |
| `borto-pack:beautify`            |    <kbd>F5</kbd>    | Beautify the current file.                                                                                           |
| `borto-pack:build`               |    <kbd>F6</kbd>    | Compile the current file.                                                                                            |
| `borto-pack:build-and-run`       |    <kbd>F7</kbd>    | Build current file and run the executable.                                                                           |
| `borto-pack:run`                 |    <kbd>F8</kbd>    | Run the executable file corresponding to the current file.                                                           |
| `borto-pack:multi-run`           | <kbd>shift-F8</kbd> | Run the executable file on each file in the directory `input` and saves the outputs in the directory `output`. |

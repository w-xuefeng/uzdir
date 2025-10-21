# 📁 UZDir

[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

A lightweight batch decompression tool for compressed files based on `TypeScript`, `Bun` and `Node-7z`, supporting decompression of various formats of compressed files (such as zip, 7z, etc.) and password-protected file decompression 📦🔑

[![NPM Last Update](https://img.shields.io/npm/last-update/uzdir?style=for-the-badge)](http://npmjs.com/package/uzdir)
[![NPM Version](https://img.shields.io/npm/v/uzdir?style=for-the-badge)](http://npmjs.com/package/uzdir)
[![NPM Downloads](https://img.shields.io/npm/dy/uzdir?style=for-the-badge)](http://npmjs.com/package/uzdir)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[简体中文](README-zh_CN.md) | English

## 🌟 Features

- 📂 Recursively decompress all compressed files in a directory, maintaining the original directory structure
- 🗂️ Supports multiple compression formats (zip, rar, 7z, etc.)
- 🔐 Supports decompression of password-protected compressed files
- ⚡ Supports concurrent decompression, fully utilizing multi-core CPU performance
- 🚫 Can filter specific files or directories through command line parameters
- ⚙️ Supports custom maximum concurrency
- 🔑 Supports specifying different passwords for different files
- 📊 Detailed processing logs and statistics
- 📍 Supports specifying whether to create subdirectories with the same name
- 🙈 Supports ignoring specific files/directories when scanning compressed files, hidden files are ignored by default
- 📄 Supports decompressing single files
- 📝 Log output location can be controlled

## 🚀 Installation

Make sure you have [Bun](https://bun.sh/) environment installed:

```bash
curl -fsSL https://bun.sh/install | bash
```

Install globally via bun:

```bash
bun add uzdir -g
```

Or clone the project and install dependencies:

```bash
git clone <repository-url>
cd uzdir
bun install
```

## 📖 Usage

After installation, you can directly use the `uzdir` command:

```bash
uzdir -i <input directory> -o <output directory> [-p <password>] [--filter <filter path>] [--maxConcurrency <concurrency>] [--zipFormat <format>] [--passwordMap <password mapping file>] [--fullpath <true|false>]
```

Or run in the project directory:

```bash
bun run uzdir -- -i <input directory> -o <output directory> [-p <password>] [--filter <filter path>] [--maxConcurrency <concurrency>] [--zipFormat <format>] [--passwordMap <password mapping file>] [--fullpath <true|false>]
```

### 🌐 Language Switching

UZDir supports switching between English (default) and Chinese languages:

```bash
# View current language and available languages
uzdir lang

# Switch to Chinese
uzdir lang zh_CN

# Switch to English
uzdir lang en_US
```

Language settings are persisted in the configuration file at `~/.uzdir/config.json`.

### 🛠️ Parameter Description

- `-i, --input <dir>`: Input directory path or compressed file path (required)
- `-o, --output <dir>`: Output directory path (required)
- `-p, --password <password>`: Decompression password (optional, no password by default)
- `--filter <filterpaths>`: File paths to filter (relative paths within the compressed package), multiple paths separated by commas (optional). Supports glob wildcards:
  - `*` Matches any name in a single-level directory
  - `**` Matches any name in multi-level nested directories
- `--maxConcurrency <number>`: Maximum concurrency (optional, defaults to CPU core count)
- `--zipFormat <formats>`: Compressed file formats, multiple formats separated by commas (optional, defaults to `.zip,.rar`)
- `--passwordMap <filepath>`: Password mapping JSON file path (optional)
- `--ignore <patterns>`: Patterns to ignore files/directories, multiple patterns separated by commas, supports simple glob patterns, hidden files are ignored by default
- `--log`: Whether to output logs to the output directory, default is false
- `--fullpath <flag>`: Whether to use full path decompression (i.e. create subdirectories with the same name), default is true, setting to false, 0 or '0' and other falsy values will extract all decompressed files to one directory
- `-v, --version`: Show version information

### 🔐 Password Mapping File

Using the `--passwordMap` parameter, you can specify different passwords for different compressed files. This parameter accepts a JSON file path with the following format:

```json
{
  "/absolute/path/to/file1.zip": "password1",
  "/absolute/path/to/file2.7z": "password2",
  "sensitive_folder": "folder_password",
  "protected.rar": "rar_password",
  ".7z": "7z_default_password"
}
```

Password matching rules:
1. 🔎 Priority matching of complete absolute paths
2. 🧩 Then matching partial paths
3. 📄 Next matching file names
4. 🎯 Finally matching file formats (extensions)
5. 🛡️ If none match, use the default password provided by the `-p` parameter

### 🚫 Ignoring Files/Directories

Using the `--ignore` parameter, you can ignore specific files or directories when scanning compressed files. Supports simple glob patterns:

- `*.tmp.zip` - Ignore all .tmp.zip files
- `temp*` - Ignore all files/directories starting with temp
- `backup` - Ignore files/directories named backup

By default, all hidden files and directories starting with `.` are ignored.

### 📍 Decompression Path Mode

UZDir supports two decompression path modes:

1. **Full Path Mode (Default)**: Use `--fullpath true` (default value)
   - Maintain the complete directory structure in the compressed file and create subdirectories with the same name

2. **Non-Full Path Mode**: Use `--fullpath false`, `--fullpath 0` and other falsy values
   - Do not create subdirectories with the same name, only extract files to the specified directory

### 📝 Log Output Location

UZDir supports controlling the log output location:

1. **Default Location**: Logs are output to the `$HOME/.uzdir/logs` directory by default
2. **Output Directory**: Using the `--log` parameter can output logs to the specified output directory

### 💡 Examples

Decompress all ZIP files in a directory:

```bash
uzdir -i ./zips -o ./output
```

Decompress a single compressed file:

```bash
uzdir -i archive.zip -o ./output
```

Decompress compressed files in multiple formats:

```bash
uzdir -i ./archives -o ./output --zipFormat ".zip,.7z,.rar"
```

Decompress with password:

```bash
uzdir -i ./zips -o ./output -p mypassword
```

Decompress using password mapping file:

```bash
uzdir -i ./zips -o ./output --passwordMap passwords.json
```

Use default password and password mapping file simultaneously:

```bash
uzdir -i ./zips -o ./output -p defaultpassword --passwordMap passwords.json
```

Decompress and filter specific files:

```bash
uzdir -i ./zips -o ./output --filter unwanted.txt
```

Decompress and filter multiple files/directories:

```bash
uzdir -i ./zips -o ./output --filter unwanted.txt,temp_folder,__MACOSX
```

Filter files using glob wildcards:

```bash
uzdir -i ./zips -o ./output --filter "*/__MACOSX,**/.DS_Store,*.tmp"
```

Set maximum concurrency:

```bash
uzdir -i ./zips -o ./output --maxConcurrency 4
```

Decompress without creating subdirectories with the same name:

```bash
uzdir -i ./zips -o ./output --fullpath false
```

Use ignore patterns:

```bash
uzdir -i ./zips -o ./output --ignore "*.tmp.zip,*.log.zip,backup.7z"
```

Output logs to the output directory:

```bash
uzdir -i ./zips -o ./output --log
```

## 🧪 Testing

The project includes a test script that can be run with the following command:

```bash
bun run test
```

This will execute the preset test command, decompressing compressed files in the [test/from](test/from) directory to the [test/to](test/to) directory.

## ⚙️ Tech Stack

- [Bun](https://bun.sh/) - Runtime environment
- [TypeScript](https://www.typescriptlang.org/) - Programming language
- [commander](https://github.com/tj/commander.js/) - Command line argument parsing
- [node-7z](https://github.com/quentinrossetti/node-7z) - 7-Zip wrapper

## 📄 License

MIT

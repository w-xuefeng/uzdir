# uzdir

一个基于 TypeScript 和 Bun 构建的轻量级压缩文件批量解压工具，支持多种格式的压缩文件解压（如 zip、7z 等）和密码保护的文件解压。

## 功能特点

- 递归解压目录下的所有压缩文件，保持原有目录结构
- 支持多种压缩格式（zip、7z 等）
- 支持密码保护的压缩文件解压
- 支持并发解压，充分利用多核 CPU 性能
- 可通过命令行参数过滤特定文件或目录
- 支持自定义最大并发数
- 详细的处理日志和统计信息

## 安装

确保你已经安装了 [Bun](https://bun.sh/) 环境：

```bash
curl -fsSL https://bun.sh/install | bash
```

通过 npm 全局安装：

```bash
bun add uzdir -g
```

或者克隆项目并安装依赖：

```bash
git clone <repository-url>
cd uzdir
bun install
```

## 使用方法

安装后，可以直接使用 `uzdir` 命令：

```bash
uzdir -i <输入目录> -o <输出目录> [-p <密码>] [--filter <过滤路径>] [--maxConcurrency <并发数>] [--zipFormat <格式>]
```

或者在项目目录中运行：

```bash
bun run uzdir -- -i <输入目录> -o <输出目录> [-p <密码>] [--filter <过滤路径>] [--maxConcurrency <并发数>] [--zipFormat <格式>]
```

### 参数说明

- `-i, --input <dir>`: 输入目录路径（必填）
- `-o, --output <dir>`: 输出目录路径（必填）
- `-p, --password <password>`: 解压密码（可选，默认无密码）
- `--filter <filterpath>`: 要过滤的文件路径（压缩包内相对路径）（可选）
- `--maxConcurrency <number>`: 最大并发数（可选，默认为 CPU 核心数）
- `--zipFormat <formats>`: 压缩文件格式，多个格式用逗号分隔（可选，默认为 .zip）
- `-v, --version`: 显示版本信息

### 示例

解压目录中的所有 ZIP 文件：

```bash
uzdir -i ./zips -o ./output
```

解压多种格式的压缩文件：

```bash
uzdir -i ./archives -o ./output --zipFormat ".zip,.7z,.rar"
```

使用密码解压：

```bash
uzdir -i ./zips -o ./output -p mypassword
```

解压并过滤特定文件：

```bash
uzdir -i ./zips -o ./output --filter unwanted.txt
```

设置最大并发数：

```bash
uzdir -i ./zips -o ./output --maxConcurrency 4
```

## 测试

项目包含一个测试脚本，可以通过以下命令运行：

```bash
bun run test
```

这会执行预设的测试命令，解压 [test/from](test/from) 目录中的压缩文件到 [test/to](test/to) 目录。

## 技术栈

- [Bun](https://bun.sh/) - 运行时环境
- [TypeScript](https://www.typescriptlang.org/) - 编程语言
- [commander](https://github.com/tj/commander.js/) - 命令行参数解析
- [node-7z](https://github.com/quentinrossetti/node-7z) - 7-Zip 包装器

## 许可证

MIT

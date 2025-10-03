# 🧹 NodeMaid

Clean up `node_modules` directories across your projects and reclaim disk space.

## Installation

```bash
npm install -g nodemaid
```

## Usage

```bash
# Clean current directory and subdirectories
nodemaid

# Clean specific path
nodemaid ~/projects
```

## How It Works

NodeMaid searches **only** the directory you specify (or your current directory) and finds all `node_modules` folders within it. It then:

1. Shows you what it found with sizes
2. Asks for confirmation
3. Deletes only the `node_modules` folders (your code stays safe!)

**Important:** It will NOT search your entire system. If you run `nodemaid ~/projects`, it only looks inside that folder.

## What Gets Deleted

✅ `node_modules` folders  
❌ Your source code  
❌ `package.json` or `package-lock.json`  
❌ Any other files  

You can always restore dependencies by running `npm install` in your projects.

## Why?

Multiple projects accumulate gigabytes in `node_modules`. NodeMaid helps you quickly identify and clean them up safely.

## Example

```bash
$ nodemaid ~/my-projects

Found 15 node_modules directories:
1. ~/my-projects/app1/node_modules (450 MB)
2. ~/my-projects/app2/node_modules (320 MB)
...

Total size: 3.2 GB

Do you want to delete all these directories? (yes/no): yes

✓ Successfully deleted 15 directories!
Freed up approximately 3.2 GB
```

## Safety

- Preview before deletion
- Confirmation required
- Only deletes `node_modules`
- Cancellable anytime (Ctrl+C or type "no")

## License

MIT
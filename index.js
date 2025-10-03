#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function getDirectorySize(dirPath) {
  try {
    // Using du command for better performance on large directories
    if (process.platform !== 'win32') {
      const { stdout } = await exec(`du -sk "${dirPath}"`);
      const sizeInKB = parseInt(stdout.split('\t')[0]);
      return sizeInKB * 1024;
    } else {
      // Fallback for Windows - basic recursive size
      let totalSize = 0;
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          totalSize += await getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
      return totalSize;
    }
  } catch (error) {
    return 0;
  }
}

async function findNodeModules(startPath, maxDepth = 5, currentDepth = 0) {
  const nodeModulesDirs = [];
  
  if (currentDepth > maxDepth) return nodeModulesDirs;
  
  try {
    const items = fs.readdirSync(startPath);
    
    for (const item of items) {
      const fullPath = path.join(startPath, item);
      
      try {
        const stats = fs.statSync(fullPath);
        
        if (!stats.isDirectory()) continue;
        
        // Skip hidden directories and common non-project folders
        if (item.startsWith('.') || 
            ['Library', 'Applications', 'System', 'Windows'].includes(item)) {
          continue;
        }
        
        if (item === 'node_modules') {
          nodeModulesDirs.push(fullPath);
          // Don't recurse into node_modules
          continue;
        }
        
        // Recurse into other directories
        const subDirs = await findNodeModules(fullPath, maxDepth, currentDepth + 1);
        nodeModulesDirs.push(...subDirs);
      } catch (err) {
        // Skip directories we can't access
        continue;
      }
    }
  } catch (err) {
    // Skip if we can't read the directory
  }
  
  return nodeModulesDirs;
}

function deleteDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function main() {
  console.log(`${colors.cyan}╔════════════════════════════════════════╗`);
  console.log(`║   Clean Node Modules Tool              ║`);
  console.log(`╚════════════════════════════════════════╝${colors.reset}\n`);
  
  // Get search path from arguments or use current directory
  const searchPath = process.argv[2] || process.cwd();
  
  if (!fs.existsSync(searchPath)) {
    console.error(`${colors.red}Error: Path "${searchPath}" does not exist${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.yellow}Searching for node_modules directories in:${colors.reset}`);
  console.log(`${colors.blue}${searchPath}${colors.reset}\n`);
  console.log(`${colors.yellow}This may take a moment...${colors.reset}\n`);
  
  const nodeModulesDirs = await findNodeModules(searchPath);
  
  if (nodeModulesDirs.length === 0) {
    console.log(`${colors.green}No node_modules directories found!${colors.reset}`);
    return;
  }
  
  console.log(`${colors.green}Found ${nodeModulesDirs.length} node_modules directories:${colors.reset}\n`);
  
  let totalSize = 0;
  const dirsWithSize = [];
  
  // Calculate sizes
  for (const dir of nodeModulesDirs) {
    const size = await getDirectorySize(dir);
    totalSize += size;
    dirsWithSize.push({ path: dir, size });
  }
  
  // Display directories
  dirsWithSize
    .sort((a, b) => b.size - a.size)
    .slice(0, 20) // Show top 20
    .forEach((item, index) => {
      console.log(`${colors.magenta}${index + 1}.${colors.reset} ${item.path}`);
      console.log(`   ${colors.cyan}Size: ${formatBytes(item.size)}${colors.reset}`);
    });
  
  if (nodeModulesDirs.length > 20) {
    console.log(`${colors.yellow}\n... and ${nodeModulesDirs.length - 20} more${colors.reset}`);
  }
  
  console.log(`\n${colors.yellow}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}Total size: ${formatBytes(totalSize)}${colors.reset}`);
  console.log(`${colors.yellow}═══════════════════════════════════════${colors.reset}\n`);
  
  const answer = await askQuestion(
    `${colors.red}Do you want to delete all these directories? (yes/no): ${colors.reset}`
  );
  
  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    console.log(`${colors.yellow}Operation cancelled.${colors.reset}`);
    return;
  }
  
  console.log(`\n${colors.yellow}Deleting...${colors.reset}\n`);
  
  let deletedCount = 0;
  for (const dir of nodeModulesDirs) {
    try {
      deleteDirectory(dir);
      deletedCount++;
      process.stdout.write(`${colors.green}Deleted ${deletedCount}/${nodeModulesDirs.length}${colors.reset}\r`);
    } catch (err) {
      console.error(`\n${colors.red}Failed to delete: ${dir}${colors.reset}`);
    }
  }
  
  console.log(`\n\n${colors.green}✓ Successfully deleted ${deletedCount} directories!${colors.reset}`);
  console.log(`${colors.cyan}Freed up approximately ${formatBytes(totalSize)}${colors.reset}`);
}

main().catch(err => {
  console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
  process.exit(1);
});

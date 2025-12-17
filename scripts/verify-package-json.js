#!/usr/bin/env node

/**
 * Verify package.json is valid JSON
 * Run this before committing to catch JSON syntax errors early
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageLockPath = path.join(__dirname, '..', 'package-lock.json');

function verifyJson(filePath, fileName) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for common issues
    const issues = [];
    
    // Check for merge conflict markers
    if (content.includes('<<<<<<<') || content.includes('=======') || content.includes('>>>>>>>')) {
      issues.push('Contains merge conflict markers');
    }
    
    // Check for BOM
    if (content.charCodeAt(0) === 0xFEFF) {
      issues.push('Contains BOM (Byte Order Mark)');
    }
    
    // Try to parse as JSON
    const parsed = JSON.parse(content);
    
    // Check for trailing commas (this is a common issue)
    const lines = content.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      const nextLine = lines[i + 1]?.trim();
      if (line.endsWith(',') && (nextLine === '}' || nextLine === ']')) {
        issues.push(`Trailing comma on line ${i + 1} before closing brace/bracket`);
      }
    }
    
    if (issues.length > 0) {
      console.error(`❌ ${fileName} has issues:`);
      issues.forEach(issue => console.error(`   - ${issue}`));
      process.exit(1);
    }
    
    console.log(`✅ ${fileName} is valid JSON`);
    return true;
  } catch (error) {
    console.error(`❌ ${fileName} is invalid JSON:`);
    console.error(`   ${error.message}`);
    
    // Try to find the line number
    if (error.message.includes('position')) {
      const match = error.message.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1]);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.substring(0, position).split('\n');
        console.error(`   Error near line ${lines.length}`);
        console.error(`   Context: ${lines[lines.length - 1]}`);
      }
    }
    
    process.exit(1);
  }
}

console.log('Verifying package files...\n');

verifyJson(packageJsonPath, 'package.json');
verifyJson(packageLockPath, 'package-lock.json');

console.log('\n✅ All package files are valid!');



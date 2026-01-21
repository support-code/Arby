const fs = require('fs');
const path = require('path');

// Create out directory if it doesn't exist
const outDir = path.join(process.cwd(), 'out');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Create _static directory
const staticDir = path.join(outDir, '_static');
if (!fs.existsSync(staticDir)) {
  fs.mkdirSync(staticDir, { recursive: true });
}

// Copy .next/static to out/_static if it exists
const nextStaticDir = path.join(process.cwd(), '.next', 'static');
if (fs.existsSync(nextStaticDir)) {
  const { execSync } = require('child_process');
  try {
    // Use platform-appropriate copy command
    if (process.platform === 'win32') {
      execSync(`xcopy /E /I /Y "${nextStaticDir}" "${staticDir}"`, { stdio: 'inherit' });
    } else {
      execSync(`cp -r "${nextStaticDir}"/* "${staticDir}"/`, { stdio: 'inherit' });
    }
    console.log('✓ Copied static files to out/_static');
  } catch (error) {
    console.log('⚠ Could not copy static files:', error.message);
  }
} else {
  console.log('⚠ .next/static directory not found');
}

console.log('✓ Build preparation completed');


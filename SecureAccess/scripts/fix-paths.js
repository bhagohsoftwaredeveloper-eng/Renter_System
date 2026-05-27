const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../dist/index.html');

if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf8');
  // Replace absolute paths with relative ones
  // We look for src="/ and href="/ and replace with src="./ and href="./
  content = content.replace(/src="\//g, 'src="./');
  content = content.replace(/href="\//g, 'href="./');
  
  // Also handle any other common occurrences if necessary, 
  // but src and href are the most critical for index.html
  
  fs.writeFileSync(indexPath, content);
  console.log('Successfully fixed paths in dist/index.html');
} else {
  console.error('Error: dist/index.html not found at ' + indexPath);
  process.exit(1);
}

// Also fix paths in the generated JS bundles
const jsDir = path.join(__dirname, '../dist/_expo/static/js/web');
if (fs.existsSync(jsDir)) {
  const files = fs.readdirSync(jsDir);
  files.forEach(file => {
    if (file.endsWith('.js')) {
      const filePath = path.join(jsDir, file);
      let jsContent = fs.readFileSync(filePath, 'utf8');
      
      // Replace "/assets/..." with "./assets/..."
      jsContent = jsContent.replace(/"\/assets\//g, '"./assets/');
      
      fs.writeFileSync(filePath, jsContent);
      console.log(`Successfully fixed paths in ${file}`);
    }
  });
}

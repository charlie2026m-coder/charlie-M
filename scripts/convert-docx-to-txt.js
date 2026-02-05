const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const inputDir = path.join(__dirname, '..', 'Translations Updated');
const outputDir = path.join(__dirname, '..', 'Translations Converted');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Get all .docx files
const files = fs.readdirSync(inputDir).filter(file => file.endsWith('.docx'));

console.log(`Found ${files.length} .docx files to convert\n`);

// Convert each file
files.forEach(async (file) => {
  const inputPath = path.join(inputDir, file);
  const outputPath = path.join(outputDir, file.replace('.docx', '.txt'));
  
  try {
    const result = await mammoth.extractRawText({ path: inputPath });
    fs.writeFileSync(outputPath, result.value);
    console.log(`✓ Converted: ${file}`);
  } catch (error) {
    console.error(`✗ Error converting ${file}:`, error.message);
  }
});

console.log('\nConversion complete!');

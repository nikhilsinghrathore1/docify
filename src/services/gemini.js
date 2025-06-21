const axios = require('axios');
const crypto = require('crypto');

class GeminiService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
        this.model = 'gemini-1.5-flash-latest';
        this.maxTokens = 8000; // Increased for more detailed content
        this.asciiArtStyles = [
            'block', 'shadow', 'slant', 'bubble', 'digital', 'graffiti', 
            'gothic', 'isometric', 'script', 'banner', 'dotted', 'starwars'
        ];
        this.emojiSets = [
            ['🚀', '⭐', '💫', '✨', '🌟'],
            ['🔥', '💎', '⚡', '🌈', '🎯'],
            ['🎨', '🎭', '🎪', '🎊', '🎉'],
            ['💻', '🖥️', '📱', '⌨️', '🖱️'],
            ['🛠️', '🔧', '⚙️', '🔩', '🧰'],
            ['🌐', '🔗', '📡', '🛰️', '📶']
        ];
    }

    generateCommitBasedSeed(repository) {
        // Create a unique seed based on repository info and current timestamp
        const seedString = `${repository.name}-${repository.owner.login}-${Date.now()}`;
        return crypto.createHash('md5').update(seedString).digest('hex');
    }

    selectRandomElement(array, seed) {
        // Use seed to ensure consistent randomness within the same generation
        const seedNumber = parseInt(seed.substring(0, 8), 16);
        return array[seedNumber % array.length];
    }

    generateDynamicAsciiPrompt(projectName, seed) {
        const asciiStyle = this.selectRandomElement(this.asciiArtStyles, seed);
        const emojiSet = this.selectRandomElement(this.emojiSets, seed);
        
        return `Create a unique ASCII art banner for "${projectName}" using ${asciiStyle} style. 
        Make it visually striking and different from standard templates. 
        Surround it with ${emojiSet.join(' ')} emojis for decoration.
        Use creative spacing and alignment. Make it memorable and distinctive.
        The ASCII art should be contained within markdown code blocks with proper formatting.`;
    }

    generateDynamicBadgeLayout(seed) {
        const layouts = [
            'horizontal-grid', 'vertical-stack', 'badge-gallery', 
            'grouped-categories', 'rainbow-arrangement', 'star-pattern'
        ];
        const selectedLayout = this.selectRandomElement(layouts, seed);
        
        return `Arrange badges in a ${selectedLayout} layout using markdown tables and creative spacing. 
        Make the badge arrangement visually unique and eye-catching.`;
    }

    generateDynamicColorScheme(seed) {
        const colorSchemes = [
            { primary: 'blue', secondary: 'cyan', accent: 'purple' },
            { primary: 'green', secondary: 'lime', accent: 'teal' },
            { primary: 'red', secondary: 'orange', accent: 'pink' },
            { primary: 'purple', secondary: 'violet', accent: 'indigo' },
            { primary: 'orange', secondary: 'yellow', accent: 'amber' },
            { primary: 'teal', secondary: 'aqua', accent: 'mint' }
        ];
        
        return this.selectRandomElement(colorSchemes, seed);
    }

    async generateReadme(files, repository) {
        try {
            const prompt = this.buildEnhancedPrompt(files, repository);

            console.log(`Sending enhanced prompt to Gemini (${prompt.length} characters)`);

            const response = await axios.post(
                `${this.baseURL}?key=${this.apiKey}`,
                {
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: this.maxTokens,
                        temperature: 0.9, // Increased for more variety
                        topP: 0.95,
                        topK: 50
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ]
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.candidates && response.data.candidates[0]) {
                const candidate = response.data.candidates[0];
                if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
                    return candidate.content.parts[0].text;
                } else {
                    throw new Error('Invalid response structure from Gemini API');
                }
            } else {
                throw new Error('No candidates returned from Gemini API');
            }
        } catch (error) {
            console.error('Error calling Gemini API:', error.response?.data || error.message);

            // Fallback to enhanced README if Gemini fails
            return this.generateEnhancedFallbackReadme(repository);
        }
    }

    buildEnhancedPrompt(files, repository) {
        const techStack = this.detectTechStack(files);
        const projectType = this.detectProjectType(files, repository);
        const seed = this.generateCommitBasedSeed(repository);
        const colorScheme = this.generateDynamicColorScheme(seed);
        const emojiSet = this.selectRandomElement(this.emojiSets, seed);
        
        let prompt = `Create an exceptionally visually appealing and UNIQUE README.md file for this ${projectType} project using ONLY pure Markdown syntax. `;
        prompt += `The repository is "${repository.name}" by "${repository.owner.login}". `;
        prompt += `IMPORTANT: Make this README visually DIFFERENT from any standard template. Use creative layouts and unique designs. `;
    
        if (repository.description) {
            prompt += `Description: "${repository.description}". `;
        }

        // Dynamic ASCII Art Instructions
        prompt += `\n\n🎨 UNIQUE VISUAL DESIGN REQUIREMENTS:\n`;
        prompt += this.generateDynamicAsciiPrompt(repository.name, seed);
        prompt += `\n${this.generateDynamicBadgeLayout(seed)}\n`;
        prompt += `- Use ${emojiSet.join(' ')} as primary emoji theme throughout\n`;
        prompt += `- Create a ${colorScheme.primary}-${colorScheme.secondary} color scheme for badges\n`;
        prompt += `- Make every visual element unique and memorable\n`;
        prompt += `- Avoid generic templates - be creative and distinctive\n\n`;
    
        prompt += `🎯 PURE MARKDOWN DESIGN REQUIREMENTS:\n`;
        prompt += `- Use strategic and varied emojis throughout (focus on: ${emojiSet.join(' ')})\n`;
        prompt += `- Include colorful badges from shields.io with ${colorScheme.primary} and ${colorScheme.secondary} colors\n`;
        prompt += `- Create UNIQUE ASCII art banners using code blocks - make them distinctive\n`;
        prompt += `- Use markdown horizontal rules (---) for visual section separation\n`;
        prompt += `- Leverage markdown tables for organized data presentation\n`;
        prompt += `- Use nested lists and proper indentation for hierarchy\n`;
        prompt += `- Include mermaid diagrams in code blocks for visual flow charts\n`;
        prompt += `- Use blockquotes (>) for callouts and important information\n`;
        prompt += `- Employ different heading levels (# ## ### ####) with emoji prefixes\n`;
        prompt += `- Create badge galleries using aligned markdown image syntax\n`;
        prompt += `- Use markdown details/summary for collapsible sections\n`;
        prompt += `- Implement consistent spacing and formatting patterns\n\n`;

        prompt += `🌟 UNIQUENESS REQUIREMENTS:\n`;
        prompt += `- Generate timestamp: ${new Date().toISOString()}\n`;
        prompt += `- Seed: ${seed.substring(0, 8)}\n`;
        prompt += `- ASCII style: Use creative ${this.selectRandomElement(this.asciiArtStyles, seed)} styling\n`;
        prompt += `- Badge arrangement: Create a unique ${this.selectRandomElement(['grid', 'flow', 'cascade', 'spiral', 'wave'])} pattern\n`;
        prompt += `- Color theme: ${colorScheme.primary}/${colorScheme.secondary}/${colorScheme.accent}\n`;
        prompt += `- Make every section visually distinct from standard README templates\n`;
        prompt += `- Use creative spacing, alignment, and visual hierarchy\n\n`;
    
        prompt += `📋 REQUIRED SECTIONS (with unique styling):\n`;
        prompt += `1. 🎨 UNIQUE header with distinctive ASCII title art, tagline, and creative badge gallery\n`;
        prompt += `2. 🌟 Feature highlights using markdown lists with themed emojis\n`;
        prompt += `3. 🛠️ Tech stack displayed as creative badge arrangements\n`;
        prompt += `4. 🚀 Quick start guide with syntax-highlighted code blocks\n`;
        prompt += `5. 📖 Detailed usage with multiple code examples and explanations\n`;
        prompt += `6. 🏗️ Project structure using markdown code blocks or creative lists\n`;
        prompt += `7. 🎯 API documentation with markdown tables and code samples\n`;
        prompt += `8. 🔧 Configuration options in well-formatted tables\n`;
        prompt += `9. 📸 Screenshots/Demo section with image galleries\n`;
        prompt += `10. 🤝 Contributing guidelines with clear markdown formatting\n`;
        prompt += `11. 📜 License and acknowledgments section\n`;
        prompt += `12. 👥 Contributors section with avatar links\n`;
        prompt += `13. 📞 Support and contact info with linked badges\n\n`;
    
        prompt += `🎭 MARKDOWN STYLE GUIDELINES:\n`;
        prompt += `- NO HTML tags - use only pure markdown syntax\n`;
        prompt += `- Create UNIQUE visual hierarchy with proper heading levels\n`;
        prompt += `- Use markdown tables for structured data (| Column | Column |)\n`;
        prompt += `- Implement collapsible sections with <details><summary> markdown\n`;
        prompt += `- Use code fences with language specification (\`\`\`javascript)\n`;
        prompt += `- Create visual breaks with horizontal rules (---)\n`;
        prompt += `- Use blockquotes (>) for highlighting important information\n`;
        prompt += `- Align badges and images using markdown link syntax\n`;
        prompt += `- Use bullet points (- * +) and numbered lists effectively\n`;
        prompt += `- Create DISTINCTIVE ASCII art in code blocks for visual appeal\n\n`;
    
        if (techStack.length > 0) {
            prompt += `🔍 DETECTED TECHNOLOGIES: ${techStack.join(', ')}\n`;
            prompt += `Create a beautiful and UNIQUE badge gallery for these technologies using shields.io markdown syntax with ${colorScheme.primary} theme.\n\n`;
        }
    
        prompt += `💼 PROJECT TYPE: ${projectType}\n`;
        prompt += `Structure the README specifically for this project type using appropriate and CREATIVE markdown formatting.\n\n`;
    
        prompt += `🎨 UNIQUE MARKDOWN VISUAL ELEMENTS TO INCLUDE:\n`;
        prompt += `- DISTINCTIVE ASCII art headers in code blocks (avoid generic designs)\n`;
        prompt += `- Mermaid diagrams (graph TD, flowchart, etc.) in code fences\n`;
        prompt += `- Well-structured tables with proper alignment and creative headers\n`;
        prompt += `- Collapsible FAQ using <details><summary> markdown\n`;
        prompt += `- Progress roadmap using markdown task lists (- [x] - [ ])\n`;
        prompt += `- Feature lists with themed emoji bullets and descriptions\n`;
        prompt += `- Code blocks with syntax highlighting for multiple languages\n`;
        prompt += `- CREATIVE badge arrangements in markdown tables for organization\n`;
        prompt += `- Nested lists for hierarchical information\n`;
        prompt += `- Blockquotes for warnings, tips, and important notes\n\n`;
    
        prompt += `🎯 MARKDOWN FORMATTING EXCELLENCE:\n`;
        prompt += `- Use consistent spacing (2 blank lines between major sections)\n`;
        prompt += `- Align table columns properly with consistent spacing\n`;
        prompt += `- Use appropriate emoji prefixes for each section header\n`;
        prompt += `- Create visual rhythm with alternating content types\n`;
        prompt += `- Use markdown reference-style links for cleaner appearance\n`;
        prompt += `- Implement proper code block language tags for syntax highlighting\n`;
        prompt += `- Use horizontal rules strategically for section separation\n\n`;

        prompt += `🚨 CRITICAL UNIQUENESS REQUIREMENT:\n`;
        prompt += `This README must be visually DIFFERENT from standard templates. `;
        prompt += `Create something memorable and distinctive that stands out. `;
        prompt += `Use the seed ${seed.substring(0, 8)} to ensure uniqueness. `;
        prompt += `Every generation should look different from the last!\n\n`;
    
        prompt += `Make this README visually stunning and UNIQUE using ONLY markdown features. It should be engaging, `;
        prompt += `professional, distinctive, and demonstrate mastery of markdown formatting while making developers `;
        prompt += `excited to use and contribute to the project!\n\n`;
        prompt += `📁 PROJECT FILES ANALYSIS:\n\n`;
    
        let totalLength = prompt.length;
        const maxPromptLength = 45000;
    
        for (const file of files) {
            const fileSection = `--- FILE: ${file.path} ---\n${file.content}\n\n`;
    
            if (totalLength + fileSection.length > maxPromptLength) {
                prompt += `--- TRUNCATED: Additional files exist but were omitted due to length limits ---\n`;
                break;
            }
    
            prompt += fileSection;
            totalLength += fileSection.length;
        }
    
        return prompt;
    }

    detectTechStack(files) {
        const techStack = new Set();
        
        files.forEach(file => {
            const path = file.path.toLowerCase();
            const content = file.content.toLowerCase();
            
            // Language detection
            if (path.endsWith('.js') || path.includes('package.json')) techStack.add('JavaScript');
            if (path.endsWith('.ts') || path.includes('tsconfig.json')) techStack.add('TypeScript');
            if (path.endsWith('.py') || path.includes('requirements.txt')) techStack.add('Python');
            if (path.endsWith('.java')) techStack.add('Java');
            if (path.endsWith('.cpp') || path.endsWith('.c++')) techStack.add('C++');
            if (path.endsWith('.c')) techStack.add('C');
            if (path.endsWith('.cs')) techStack.add('C#');
            if (path.endsWith('.go')) techStack.add('Go');
            if (path.endsWith('.rs')) techStack.add('Rust');
            if (path.endsWith('.php')) techStack.add('PHP');
            if (path.endsWith('.rb')) techStack.add('Ruby');
            
            // Framework detection
            if (content.includes('react')) techStack.add('React');
            if (content.includes('vue')) techStack.add('Vue.js');
            if (content.includes('angular')) techStack.add('Angular');
            if (content.includes('express')) techStack.add('Express.js');
            if (content.includes('fastapi')) techStack.add('FastAPI');
            if (content.includes('flask')) techStack.add('Flask');
            if (content.includes('django')) techStack.add('Django');
            if (content.includes('spring')) techStack.add('Spring');
            if (content.includes('nextjs') || content.includes('next.js')) techStack.add('Next.js');
            
            // Database detection
            if (content.includes('mongodb') || content.includes('mongoose')) techStack.add('MongoDB');
            if (content.includes('postgresql') || content.includes('postgres')) techStack.add('PostgreSQL');
            if (content.includes('mysql')) techStack.add('MySQL');
            if (content.includes('redis')) techStack.add('Redis');
            
            // Other tools
            if (path.includes('dockerfile')) techStack.add('Docker');
            if (path.includes('docker-compose')) techStack.add('Docker Compose');
            if (content.includes('kubernetes')) techStack.add('Kubernetes');
            if (content.includes('aws')) techStack.add('AWS');
            if (content.includes('azure')) techStack.add('Azure');
            if (content.includes('gcp') || content.includes('google cloud')) techStack.add('Google Cloud');
        });
        
        return Array.from(techStack);
    }

    detectProjectType(files, repository) {
        const name = repository.name.toLowerCase();
        const description = (repository.description || '').toLowerCase();
        
        // Check for specific project types
        if (name.includes('api') || description.includes('api')) return 'REST API';
        if (name.includes('bot') || description.includes('bot')) return 'Bot Application';
        if (name.includes('cli') || description.includes('command line')) return 'CLI Tool';
        if (name.includes('lib') || name.includes('library')) return 'Library/Package';
        if (name.includes('app') || description.includes('application')) return 'Application';
        if (name.includes('web') || description.includes('website')) return 'Web Application';
        if (name.includes('mobile') || description.includes('mobile')) return 'Mobile Application';
        if (name.includes('game') || description.includes('game')) return 'Game';
        if (name.includes('tool') || description.includes('tool')) return 'Development Tool';
        
        // Check file patterns
        const hasPackageJson = files.some(f => f.path.includes('package.json'));
        const hasRequirementsTxt = files.some(f => f.path.includes('requirements.txt'));
        const hasDockerfile = files.some(f => f.path.includes('Dockerfile'));
        
        if (hasPackageJson) return 'Node.js Application';
        if (hasRequirementsTxt) return 'Python Application';
        if (hasDockerfile) return 'Containerized Application';
        
        return 'Software Project';
    }

    generateEnhancedFallbackReadme(repository) {
        const repoName = repository.name;
        const ownerName = repository.owner.login;
        const description = repository.description || 'An amazing software project';
        const repoUrl = `https://github.com/${ownerName}/${repoName}`;
        const seed = this.generateCommitBasedSeed(repository);
        const colorScheme = this.generateDynamicColorScheme(seed);
        const emojiSet = this.selectRandomElement(this.emojiSets, seed);

        // Generate unique ASCII art based on seed
        const asciiVariations = [
            `
╔═══════════════════════════════════════════════════════════╗
║  ${emojiSet[0]}  ${repoName.toUpperCase().padEnd(45)} ${emojiSet[1]}  ║
╚═══════════════════════════════════════════════════════════╝
            `,
            `
    ${emojiSet[0]}${emojiSet[1]}${emojiSet[2]}  ${repoName.toUpperCase()}  ${emojiSet[2]}${emojiSet[1]}${emojiSet[0]}
    ════════════════════════════════════════════════
            `,
            `
  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  ░░ ${emojiSet[0]}  ${repoName.toUpperCase()}  ${emojiSet[1]} ░░
  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
            `
        ];

        const selectedAscii = this.selectRandomElement(asciiVariations, seed);

        return `<div align="center">

\`\`\`
${selectedAscii}
\`\`\`

### ${emojiSet[0]} ${description} ${emojiSet[1]}

[![GitHub stars](https://img.shields.io/github/stars/${ownerName}/${repoName}?style=for-the-badge&logo=github&color=${colorScheme.primary})](${repoUrl}/stargazers)
[![GitHub license](https://img.shields.io/github/license/${ownerName}/${repoName}?style=for-the-badge&color=${colorScheme.secondary})](${repoUrl}/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/${ownerName}/${repoName}?style=for-the-badge&color=${colorScheme.accent})](${repoUrl}/issues)
[![GitHub forks](https://img.shields.io/github/forks/${ownerName}/${repoName}?style=for-the-badge&color=${colorScheme.primary})](${repoUrl}/network)

</div>

---

## ${emojiSet[2]} Features

- ${emojiSet[3]} **Fast & Efficient** - Optimized for performance
- ${emojiSet[4]} **Easy to Use** - Simple and intuitive interface
- 📦 **Lightweight** - Minimal dependencies
- 🔧 **Customizable** - Highly configurable
- 🌐 **Cross-Platform** - Works everywhere

---

## ${emojiSet[0]} Quick Start

### Prerequisites

- Node.js 16+ / Python 3.8+ (depending on your project)
- Git

### Installation

\`\`\`bash
# 📥 Clone the repository
git clone ${repoUrl}.git

# 📂 Navigate to project directory
cd ${repoName}

# 📦 Install dependencies
npm install
# or
pip install -r requirements.txt
\`\`\`

### ${emojiSet[1]} Usage

\`\`\`bash
# 🏃‍♂️ Run the project
npm start
# or
python main.py
\`\`\`

---

## 📖 Documentation

<details>
<summary>📚 Click to expand documentation</summary>

### Configuration

\`\`\`json
{
  "option1": "value1",
  "option2": "value2"
}
\`\`\`

### Examples

\`\`\`javascript
// Example usage
const example = new Example();
example.run();
\`\`\`

</details>

---

## 🏗️ Project Structure

\`\`\`
${repoName}/
├── 📁 src/          # Source code
├── 📁 docs/         # Documentation
├── 📁 tests/        # Test files
├── 📄 README.md     # You are here
└── 📄 package.json  # Dependencies
\`\`\`

---

## 🤝 Contributing

We love contributions! ${emojiSet[4]}

1. 🍴 **Fork** the repository
2. 🌿 **Create** a feature branch (\`git checkout -b feature/amazing-feature\`)
3. 💾 **Commit** your changes (\`git commit -m 'Add amazing feature'\`)
4. 📤 **Push** to the branch (\`git push origin feature/amazing-feature\`)
5. 🔄 **Open** a Pull Request

---

## 📊 Stats

<div align="center">

![GitHub repo size](https://img.shields.io/github/repo-size/${ownerName}/${repoName}?style=flat-square&color=${colorScheme.primary})
![GitHub language count](https://img.shields.io/github/languages/count/${ownerName}/${repoName}?style=flat-square&color=${colorScheme.secondary})
![GitHub top language](https://img.shields.io/github/languages/top/${ownerName}/${repoName}?style=flat-square&color=${colorScheme.accent})
![GitHub last commit](https://img.shields.io/github/last-commit/${ownerName}/${repoName}?style=flat-square&color=${colorScheme.primary})

</div>

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 💝 Support

If you found this project helpful, please consider:

- ${emojiSet[0]} **Starring** the repository
- 🐛 **Reporting** bugs
- 💡 **Suggesting** new features
- 🤝 **Contributing** to the code

---

<div align="center">

### 🙏 Thank you for using ${repoName}!

**Made with ❤️ by [${ownerName}](https://github.com/${ownerName})**

---

*🤖 This README was automatically generated with unique design ${seed.substring(0, 8)}*

</div>`;
    }

    // Enhanced method for different Gemini models with visual focus
    async generateReadmeWithModel(files, repository, modelName = 'gemini-1.5-pro-latest') {
        try {
            const prompt = this.buildEnhancedPrompt(files, repository);
            const customBaseURL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

            const response = await axios.post(
                `${customBaseURL}?key=${this.apiKey}`,
                {
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: this.maxTokens,
                        temperature: 0.9, // Higher for more uniqueness
                        topP: 0.95
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.candidates && response.data.candidates[0]) {
                return response.data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Invalid response from Gemini API');
            }
        } catch (error) {
            console.error('Error calling Gemini API with custom model:', error.message);
            return this.generateEnhancedFallbackReadme(repository);
        }
    }
}

module.exports = GeminiService;
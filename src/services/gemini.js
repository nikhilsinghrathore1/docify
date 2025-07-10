const axios = require('axios');

class GeminiService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
        this.model = 'gemini-1.5-flash-latest';
        this.maxTokens = 10000; // Increased for more detailed content
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
                        temperature: 0.8, // Slightly higher for more creativity
                        topP: 0.9,
                        topK: 40
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
        
        let prompt = `Create an exceptionally visually appealing and professional README.md file for this ${projectType} project using ONLY pure Markdown syntax. don't use image tag or any html tags`;
        prompt += `The repository is "${repository.name}" by "${repository.owner.login}". `;
    
        if (repository.description) {
            prompt += `Description: "${repository.description}". `;
        }
    
        prompt += `\n\n🎯 PURE MARKDOWN DESIGN REQUIREMENTS:\n`;
        prompt += `- Use strategic emojis throughout (🚀 🔥 ✨ 💫 🎨 🛠️ 📚 🌟 ⚡ 💡 🎯 📦 🔧 💻 📱 🌐 📊)\n`;
        prompt += `- Include colorful badges from shields.io using markdown image syntax\n`;
        prompt += `- Create ASCII art banners using code blocks with proper formatting\n`;
        prompt += `- Use markdown horizontal rules (---) for visual section separation\n`;
        prompt += `- Leverage markdown tables for organized data presentation\n`;
        prompt += `- Use nested lists and proper indentation for hierarchy\n`;
        prompt += `- Include mermaid diagrams in code blocks for visual flow charts\n`;
        prompt += `- Use blockquotes (>) for callouts and important information\n`;
        prompt += `- Employ different heading levels (# ## ### ####) with emoji prefixes\n`;
        prompt += `- Create badge galleries using aligned markdown image syntax\n`;
        prompt += `- Use markdown details/summary for collapsible sections\n`;
        prompt += `- Implement consistent spacing and formatting patterns\n\n`;
    
        prompt += `📋 REQUIRED SECTIONS (pure markdown styling):\n`;
        prompt += `📋 MOST IMPORTANT RULE : do not use any html tag any where `;
        prompt += `1. 🎨 Stunning header with ASCII title art, tagline, and badge gallery\n`;
        prompt += `2. 🌟 Feature highlights using markdown lists with emojis\n`;
        prompt += `3. 🛠️ Tech stack displayed as badge grid using markdown tables\n`;
        prompt += `4. 🚀 Quick start guide with syntax-highlighted code blocks\n`;
        prompt += `5. 📖 Detailed usage with multiple code examples and explanations\n`;
        prompt += `6. 🏗️ Project structure using markdown code blocks or lists\n`;
        prompt += `7. 🎯 API documentation with markdown tables and code samples\n`;
        prompt += `8. 🔧 Configuration options in well-formatted tables\n`;
        prompt += `9. 📸 Screenshots/Demo section with image galleries\n`;
        prompt += `10. 🤝 Contributing guidelines with clear markdown formatting\n`;
        prompt += `11. 📜 License and acknowledgments section\n`;
        prompt += `12. 👥 Contributors section with avatar links\n`;
        prompt += `13. 📞 Support and contact info with linked badges\n\n`;
    
        prompt += `🎭 MARKDOWN STYLE GUIDELINES:\n`;
        prompt += `- NO HTML tags - use only pure markdown syntax\n`;
        prompt += `- Create visual hierarchy with proper heading levels\n`;
        prompt += `- Use markdown tables for structured data (| Column | Column |)\n`;
        prompt += `- Implement collapsible sections with <details><summary> markdown\n`;
        prompt += `- Use code fences with language specification (\`\`\`javascript)\n`;
        prompt += `- Create visual breaks with horizontal rules (---)\n`;
        prompt += `- Use blockquotes (>) for highlighting important information\n`;
        prompt += `- Align badges and images using markdown link syntax\n`;
        prompt += `- Use bullet points (- * +) and numbered lists effectively\n`;
        prompt += `- Create ASCII art in code blocks for visual appeal\n\n`;
    
        if (techStack.length > 0) {
            prompt += `🔍 DETECTED TECHNOLOGIES: ${techStack.join(', ')}\n`;
            prompt += `Create a beautiful badge gallery for these technologies using shields.io markdown syntax.\n\n`;
        }
    
        prompt += `💼 PROJECT TYPE: ${projectType}\n`;
        prompt += `Structure the README specifically for this project type using appropriate markdown formatting.\n\n`;
    
        prompt += `🎨 MARKDOWN VISUAL ELEMENTS TO INCLUDE:\n`;
        prompt += `- ASCII art headers in code blocks\n`;
        prompt += `- Mermaid diagrams (graph TD, flowchart, etc.) in code fences\n`;
        prompt += `- Well-structured tables with proper alignment\n`;
        prompt += `- Collapsible FAQ using <details><summary> markdown\n`;
        prompt += `- Progress roadmap using markdown task lists (- [x] - [ ])\n`;
        prompt += `- Feature lists with emoji bullets and descriptions\n`;
        prompt += `- Code blocks with syntax highlighting for multiple languages\n`;
        prompt += `- Badge arrangements in markdown tables for organization\n`;
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
    
        prompt += `Make this README visually stunning using ONLY markdown features. It should be engaging, `;
        prompt += `professional, and demonstrate mastery of markdown formatting while making developers `;
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
            console.log("testing on it's own")
        });
        
        return Array.from(techStack);
    }

    detectProjectType(files, repository) {
        const name = repository.name.toLowerCase();
        const description = (repository.description || '').toLowerCase();
        
        // Check for specific project types
        if (name.includes('api') || description.includes('api')) return 'REST API';
        if (name.includes('app') || description.includes('application')) return 'Application';
        if (name.includes('web') || description.includes('website')) return 'Web Application';
        if (name.includes('mobile') || description.includes('mobile')) return 'Mobile Application';
        if (name.includes('game') || description.includes('game')) return 'Game';
        
        // Check file patterns
        const hasPackageJson = files.some(f => f.path.includes('package.json'));
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

        return `<div align="center">

# 🚀 ${repoName}

### ✨ ${description} ✨

[![GitHub stars](https://img.shields.io/github/stars/${ownerName}/${repoName}?style=for-the-badge&logo=github)](${repoUrl}/stargazers)
[![GitHub license](https://img.shields.io/github/license/${ownerName}/${repoName}?style=for-the-badge)](${repoUrl}/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/${ownerName}/${repoName}?style=for-the-badge)](${repoUrl}/issues)
[![GitHub forks](https://img.shields.io/github/forks/${ownerName}/${repoName}?style=for-the-badge)](${repoUrl}/network)

</div>

---

## 🌟 Features

- ⚡ **Fast & Efficient** - Optimized for performance
- 🛠️ **Easy to Use** - Simple and intuitive interface
- 📦 **Lightweight** - Minimal dependencies
- 🔧 **Customizable** - Highly configurable
- 🌐 **Cross-Platform** - Works everywhere

---

## 🚀 Quick Start

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

### 🎯 Usage

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

We love contributions! 🎉

1. 🍴 **Fork** the repository
2. 🌿 **Create** a feature branch (\`git checkout -b feature/amazing-feature\`)
3. 💾 **Commit** your changes (\`git commit -m 'Add amazing feature'\`)
4. 📤 **Push** to the branch (\`git push origin feature/amazing-feature\`)
5. 🔄 **Open** a Pull Request

---

## 📊 Stats

<div align="center">

![GitHub repo size](https://img.shields.io/github/repo-size/${ownerName}/${repoName}?style=flat-square)
![GitHub language count](https://img.shields.io/github/languages/count/${ownerName}/${repoName}?style=flat-square)
![GitHub top language](https://img.shields.io/github/languages/top/${ownerName}/${repoName}?style=flat-square)
![GitHub last commit](https://img.shields.io/github/last-commit/${ownerName}/${repoName}?style=flat-square)

</div>

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 💝 Support

If you found this project helpful, please consider:

- ⭐ **Starring** the repository
- 🐛 **Reporting** bugs
- 💡 **Suggesting** new features
- 🤝 **Contributing** to the code

---

<div align="center">

### 🙏 Thank you for using ${repoName}!

**Made with ❤️ by [${ownerName}](https://github.com/${ownerName})**

---

*🤖 This README was automatically generated by a GitHub App. Please update it with project-specific information.*

</div>`;
    }

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
                        temperature: 0.8,
                        topP: 0.9
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
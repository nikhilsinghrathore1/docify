const axios = require('axios');

class GeminiService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
        this.model = 'gemini-1.5-flash-latest';
        this.maxTokens = 4000;
    }

    async generateReadme(files, repository) {
        try {
            const prompt = this.buildPrompt(files, repository);

            console.log(`Sending prompt to Gemini (${prompt.length} characters)`);

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
                        temperature: 0.7,
                        topP: 0.8,
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

            // Fallback to basic README if Gemini fails
            return this.generateFallbackReadme(repository);
        }
    }

    buildPrompt(files, repository) {
        let prompt = `I need you to generate a professional README.md file for the following project. `;
        prompt += `The repository is called "${repository.name}" and is owned by "${repository.owner.login}". `;

        if (repository.description) {
            prompt += `The repository description is: "${repository.description}". `;
        }

        prompt += `\n\nAnalyze the following files and generate a comprehensive README.md that includes:\n`;
        prompt += `1. Project title and description\n`;
        prompt += `2. Key features and functionality\n`;
        prompt += `3. Technology stack and dependencies\n`;
        prompt += `4. Installation instructions\n`;
        prompt += `5. Usage examples\n`;
        prompt += `6. API documentation (if applicable)\n`;
        prompt += `7. Contributing guidelines\n`;
        prompt += `8. License information (if found in the code)\n`;
        prompt += `9. Any other relevant sections based on the project type\n\n`;

        prompt += `Please make the README engaging, well-formatted with proper markdown, and tailored to the specific project. `;
        prompt += `Include appropriate badges, code examples, and make it beginner-friendly.\n\n`;
        prompt += `Here are the project files:\n\n`;

        let totalLength = prompt.length;
        const maxPromptLength = 45000; // Leave room for the instruction part

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

    generateFallbackReadme(repository) {
        const repoName = repository.name;
        const ownerName = repository.owner.login;
        const description = repository.description || 'A software project';

        return `# ${repoName}

${description}

## Overview

This project was automatically analyzed and this README was generated. Please update it with more specific information about your project.

## Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/${ownerName}/${repoName}.git

# Navigate to the project directory
cd ${repoName}

# Install dependencies (if applicable)
npm install
# or
pip install -r requirements.txt
# or follow the specific installation steps for your project
\`\`\`

## Usage

Please refer to the source code and documentation for usage instructions.

## Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

Please check the repository for license information.

---

*This README was automatically generated by a GitHub App. Please update it with project-specific information.*
`;
    }

    // Alternative method for different Gemini models
    async generateReadmeWithModel(files, repository, modelName = 'gemini-1.5-pro-latest') {
        try {
            const prompt = this.buildPrompt(files, repository);
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
                        temperature: 0.7
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
            return this.generateFallbackReadme(repository);
        }
    }
}

module.exports = GeminiService;
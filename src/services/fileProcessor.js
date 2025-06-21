class FileProcessor {
               constructor() {
                              this.maxFilesPerType = 15; // Increased from 10
                              this.maxFileSize = 25000; // Increased from 10000 for large important files
                              this.maxTotalSize = 300000; // Increased from 200KB to 300KB
                              this.priorityFiles = [
                                             'package.json',
                                             'requirements.txt',
                                             'Cargo.toml',
                                             'go.mod',
                                             'pom.xml',
                                             'composer.json',
                                             'Gemfile',
                                             'Dockerfile',
                                             'docker-compose.yml',
                                             'README.md',
                                             'LICENSE',
                                             'main.py',
                                             'index.js',
                                             'app.js',
                                             'server.js',
                                             'main.js',
                                             // Added more important files
                                             'page.tsx',
                                             'layout.tsx',
                                             'App.tsx',
                                             'App.jsx',
                                             'index.tsx',
                                             'main.tsx',
                                             'globals.css',
                                             'tailwind.config.js',
                                             'next.config.js',
                                             'vite.config.js',
                                             'webpack.config.js'
                              ];

                              // Files that should be included even if large
                              this.alwaysIncludePatterns = [
                                             /^src\/page\.(tsx?|jsx?)$/i,
                                             /^src\/layout\.(tsx?|jsx?)$/i,
                                             /^src\/App\.(tsx?|jsx?)$/i,
                                             /^src\/main\.(tsx?|jsx?)$/i,
                                             /^src\/index\.(tsx?|jsx?)$/i,
                                             /^pages\/index\.(tsx?|jsx?)$/i,
                                             /^pages\/_app\.(tsx?|jsx?)$/i,
                                             /^components\/.*\.(tsx?|jsx?)$/i,
                                             /^lib\/.*\.(tsx?|jsx?)$/i,
                                             /^utils\/.*\.(tsx?|jsx?)$/i,
                                             /^hooks\/.*\.(tsx?|jsx?)$/i,
                                             /^store\/.*\.(tsx?|jsx?)$/i,
                                             /^api\/.*\.(tsx?|jsx?|py)$/i,
                                             /^routes\/.*\.(tsx?|jsx?|py)$/i
                              ];
               }

               async processFiles(githubService, owner, repo, fileTree) {
                              try {
                                             // Filter and prioritize files
                                             const relevantFiles = this.filterRelevantFiles(fileTree);
                                             const prioritizedFiles = this.prioritizeFiles(relevantFiles);

                                             console.log(`Processing ${prioritizedFiles.length} relevant files`);

                                             const processedFiles = [];
                                             let totalSize = 0;

                                             for (const file of prioritizedFiles) {
                                                            try {
                                                                           const content = await githubService.getFileContent(owner, repo, file.path);

                                                                           if (content && content.trim()) {
                                                                                          // Check if file should always be included regardless of size
                                                                                          const shouldAlwaysInclude = this.shouldAlwaysInclude(file.path);
                                                                                          const isLargeFile = content.length > this.maxFileSize;

                                                                                          // Skip binary content
                                                                                          if (this.isBinaryContent(content)) {
                                                                                                         console.log(`Skipping binary file: ${file.path}`);
                                                                                                         continue;
                                                                                          }

                                                                                          // Handle large files intelligently
                                                                                          let processedContent = content;
                                                                                          let wasLarge = false;

                                                                                          if (isLargeFile && !shouldAlwaysInclude) {
                                                                                                         // Check if we have room for the full file
                                                                                                         if (totalSize + content.length > this.maxTotalSize) {
                                                                                                                        console.log(`File ${file.path} is large (${content.length} chars), truncating...`);
                                                                                                                        processedContent = this.truncateFile(content, file.path);
                                                                                                                        wasLarge = true;
                                                                                                         }
                                                                                          } else if (isLargeFile && shouldAlwaysInclude) {
                                                                                                         // For important large files, try to include them but maybe truncate less aggressively
                                                                                                         if (totalSize + content.length > this.maxTotalSize) {
                                                                                                                        console.log(`Important file ${file.path} is large, using smart truncation...`);
                                                                                                                        processedContent = this.smartTruncateImportantFile(content, file.path);
                                                                                                                        wasLarge = true;
                                                                                                         }
                                                                                          }

                                                                                          // Final size check
                                                                                          if (totalSize + processedContent.length > this.maxTotalSize) {
                                                                                                         console.log(`Would exceed total size limit with ${file.path}, stopping here`);
                                                                                                         break;
                                                                                          }

                                                                                          processedFiles.push({
                                                                                                         path: file.path,
                                                                                                         content: processedContent,
                                                                                                         size: processedContent.length,
                                                                                                         originalSize: content.length,
                                                                                                         type: this.getFileType(file.path),
                                                                                                         wasTruncated: wasLarge,
                                                                                                         isImportant: shouldAlwaysInclude
                                                                                          });

                                                                                          totalSize += processedContent.length;
                                                                                          const statusText = wasLarge ? ' (truncated)' : '';
                                                                                          console.log(`Processed: ${file.path} (${processedContent.length}/${content.length} chars)${statusText}`);
                                                                           }
                                                            } catch (error) {
                                                                           console.error(`Error processing file ${file.path}:`, error.message);
                                                                           continue;
                                                            }
                                             }

                                             console.log(`Total processed files: ${processedFiles.length}, Total size: ${totalSize} chars`);
                                             return processedFiles;
                              } catch (error) {
                                             console.error('Error in processFiles:', error);
                                             throw error;
                              }
               }

               shouldAlwaysInclude(filePath) {
                              return this.alwaysIncludePatterns.some(pattern => pattern.test(filePath));
               }

               truncateFile(content, filePath) {
                              const maxLength = 8000; // Reasonable truncation size

                              if (content.length <= maxLength) {
                                             return content;
                              }

                              // For code files, try to truncate at natural boundaries
                              if (this.isSourceFile(filePath)) {
                                             return this.truncateCodeFile(content, maxLength);
                              }

                              // For other files, simple truncation with notice
                              return content.substring(0, maxLength) +
                                             `\n\n// ... (file truncated for brevity - ${content.length - maxLength} more characters)`;
               }

               smartTruncateImportantFile(content, filePath) {
                              const maxLength = 15000; // More generous for important files

                              if (content.length <= maxLength) {
                                             return content;
                              }

                              // For important code files, preserve more structure
                              if (this.isSourceFile(filePath)) {
                                             return this.truncateCodeFilePreserveStructure(content, maxLength);
                              }

                              return content.substring(0, maxLength) +
                                             `\n\n// ... (important file truncated - ${content.length - maxLength} more characters)`;
               }

               truncateCodeFile(content, maxLength) {
                              if (content.length <= maxLength) {
                                             return content;
                              }

                              const lines = content.split('\n');
                              let result = '';
                              let currentLength = 0;

                              // Try to include complete functions/classes when possible
                              for (let i = 0; i < lines.length; i++) {
                                             const line = lines[i];
                                             const lineWithNewline = line + (i < lines.length - 1 ? '\n' : '');

                                             if (currentLength + lineWithNewline.length > maxLength - 200) { // Leave room for truncation notice
                                                            result += `\n\n// ... (${lines.length - i} more lines truncated)`;
                                                            break;
                                             }

                                             result += lineWithNewline;
                                             currentLength += lineWithNewline.length;
                              }

                              return result;
               }

               truncateCodeFilePreserveStructure(content, maxLength) {
                              if (content.length <= maxLength) {
                                             return content;
                              }

                              const lines = content.split('\n');
                              let result = '';
                              let currentLength = 0;
                              const reservedSpace = 500; // Space for truncation notice and end of file

                              // Include the beginning of the file
                              const halfLength = (maxLength - reservedSpace) / 2;

                              // First half
                              for (let i = 0; i < lines.length; i++) {
                                             const line = lines[i];
                                             const lineWithNewline = line + '\n';

                                             if (currentLength + lineWithNewline.length > halfLength) {
                                                            break;
                                             }

                                             result += lineWithNewline;
                                             currentLength += lineWithNewline.length;
                              }

                              result += '\n// ... (middle section truncated) ...\n\n';

                              // Last portion of the file (try to include exports, closing braces, etc.)
                              const endLines = lines.slice(-20); // Last 20 lines
                              let endContent = '';
                              for (const line of endLines) {
                                             endContent += line + '\n';
                              }

                              if (currentLength + endContent.length < maxLength) {
                                             result += endContent;
                              }

                              return result;
               }

               filterRelevantFiles(fileTree) {
                              return fileTree.filter(file => {
                                             // Skip if already filtered by GitHubService
                                             if (!file.path || file.size === 0) return false;

                                             // Always include priority files and important patterns
                                             const filename = file.path.split('/').pop().toLowerCase();
                                             if (this.priorityFiles.some(pf => pf.toLowerCase() === filename)) {
                                                            return true;
                                             }

                                             // Always include files matching important patterns
                                             if (this.shouldAlwaysInclude(file.path)) {
                                                            return true;
                                             }

                                             // Include based on file extension and relevance
                                             return this.isRelevantFile(file.path);
                              });
               }

               prioritizeFiles(files) {
                              return files.sort((a, b) => {
                                             const aFilename = a.path.split('/').pop().toLowerCase();
                                             const bFilename = b.path.split('/').pop().toLowerCase();

                                             const aPriority = this.getFilePriority(aFilename, a.path);
                                             const bPriority = this.getFilePriority(bFilename, b.path);

                                             // Higher priority first
                                             if (aPriority !== bPriority) {
                                                            return bPriority - aPriority;
                                             }

                                             // Then by importance (always include files first)
                                             const aImportant = this.shouldAlwaysInclude(a.path) ? 1 : 0;
                                             const bImportant = this.shouldAlwaysInclude(b.path) ? 1 : 0;

                                             if (aImportant !== bImportant) {
                                                            return bImportant - aImportant;
                                             }

                                             // Then by file size (smaller first, unless it's an important file)
                                             return a.size - b.size;
                              });
               }

               getFilePriority(filename, fullPath) {
                              // Highest priority - main app files
                              if (['page.tsx', 'page.jsx', 'layout.tsx', 'layout.jsx', 'app.tsx', 'app.jsx'].includes(filename)) {
                                             return 110;
                              }

                              // Very high priority - configuration and main files
                              if (['package.json', 'requirements.txt', 'cargo.toml', 'go.mod'].includes(filename)) {
                                             return 100;
                              }

                              // High priority - main application files
                              if (['main.py', 'index.js', 'app.js', 'server.js', 'main.js', 'index.tsx', 'main.tsx'].includes(filename)) {
                                             return 90;
                              }

                              // High priority - Next.js/React specific files
                              if (['next.config.js', 'tailwind.config.js', 'globals.css'].includes(filename)) {
                                             return 88;
                              }

                              // High priority - Docker and deployment
                              if (['dockerfile', 'docker-compose.yml', 'docker-compose.yaml'].includes(filename)) {
                                             return 85;
                              }

                              // Medium-high priority - documentation and config
                              if (['readme.md', 'license', 'makefile', '.gitignore'].includes(filename)) {
                                             return 80;
                              }

                              // Medium-high priority - important directories
                              if (fullPath.startsWith('src/') || fullPath.startsWith('components/') ||
                                             fullPath.startsWith('pages/') || fullPath.startsWith('lib/')) {
                                             if (this.isSourceFile(filename)) {
                                                            return 75;
                                             }
                              }

                              // Medium priority - source files in root
                              if (!fullPath.includes('/') && this.isSourceFile(filename)) {
                                             return 70;
                              }

                              // Medium priority - API and route files
                              if (fullPath.includes('api/') || fullPath.includes('routes/')) {
                                             return 65;
                              }

                              // Lower priority - test files
                              if (fullPath.includes('test') || fullPath.includes('spec') || fullPath.includes('__tests__')) {
                                             return 30;
                              }

                              // Low priority - deep nested files (unless important)
                              const depth = fullPath.split('/').length;
                              if (depth > 4) {
                                             return 20;
                              }

                              // Default priority
                              return 50;
               }

               isRelevantFile(filePath) {
                              const relevantExtensions = [
                                             // Frontend frameworks
                                             '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
                                             // Backend languages
                                             '.py', '.rb', '.go', '.java', '.cpp', '.c', '.cs', '.php',
                                             '.swift', '.kt', '.rs', '.scala', '.clj', '.hs', '.elm',
                                             // Web technologies
                                             '.html', '.css', '.scss', '.sass', '.less', '.styl',
                                             // Configuration files
                                             '.json', '.yaml', '.yml', '.toml', '.ini', '.conf', '.cfg',
                                             '.xml', '.properties', '.env',
                                             // Documentation
                                             '.md', '.rst', '.txt', '.adoc',
                                             // Scripts and automation
                                             '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
                                             // Database
                                             '.sql', '.graphql', '.gql',
                                             // Mobile
                                             '.dart', '.swift', '.kt'
                              ];

                              const filename = filePath.toLowerCase();

                              // Check extensions
                              if (relevantExtensions.some(ext => filename.endsWith(ext))) {
                                             return true;
                              }

                              // Check specific filenames without extensions
                              const basename = filePath.split('/').pop().toLowerCase();
                              const relevantFiles = [
                                             'dockerfile', 'makefile', 'rakefile', 'gemfile', 'procfile',
                                             'vagrantfile', 'gulpfile', 'gruntfile', 'webpack.config',
                                             'rollup.config', 'vite.config', 'tsconfig', 'jsconfig',
                                             'eslintrc', 'prettierrc', 'babelrc', 'editorconfig',
                                             'next.config', 'tailwind.config', 'postcss.config'
                              ];

                              return relevantFiles.some(rf => basename.includes(rf));
               }

               isSourceFile(filename) {
                              const sourceExtensions = [
                                             '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.java',
                                             '.cpp', '.c', '.cs', '.php', '.swift', '.kt', '.rs', '.dart'
                              ];

                              return sourceExtensions.some(ext => filename.endsWith(ext));
               }

               getFileType(filePath) {
                              const ext = filePath.toLowerCase().split('.').pop();
                              const filename = filePath.split('/').pop().toLowerCase();

                              // Configuration files
                              if (['json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'cfg', 'env'].includes(ext)) {
                                             return 'config';
                              }

                              // Documentation
                              if (['md', 'rst', 'txt', 'adoc'].includes(ext) || filename === 'readme') {
                                             return 'documentation';
                              }

                              // Frontend source code
                              if (['jsx', 'tsx', 'vue', 'svelte'].includes(ext)) {
                                             return 'frontend';
                              }

                              // Source code
                              if (['js', 'ts', 'py', 'rb', 'go', 'java', 'cpp', 'c', 'cs', 'php', 'swift', 'kt', 'rs'].includes(ext)) {
                                             return 'source';
                              }

                              // Web files
                              if (['html', 'css', 'scss', 'sass', 'less'].includes(ext)) {
                                             return 'web';
                              }

                              // Scripts
                              if (['sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd'].includes(ext)) {
                                             return 'script';
                              }

                              // Database
                              if (['sql', 'graphql', 'gql'].includes(ext)) {
                                             return 'database';
                              }

                              return 'other';
               }

               isBinaryContent(content) {
                              // Simple heuristic to detect binary content
                              // Check for null bytes or high ratio of non-printable characters
                              const nullBytes = (content.match(/\0/g) || []).length;
                              if (nullBytes > 0) return true;

                              const printableChars = (content.match(/[\x20-\x7E\x09\x0A\x0D]/g) || []).length;
                              const ratio = printableChars / content.length;

                              // If less than 75% printable characters, consider it binary (relaxed from 80%)
                              return ratio < 0.75;
               }
}

module.exports = FileProcessor;
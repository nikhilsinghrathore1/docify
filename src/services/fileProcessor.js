class FileProcessor {
               constructor() {
                              this.maxFilesPerType = 10; // Limit files per type to manage prompt size
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
                                             'main.js'
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
                                             const maxTotalSize = 200000; // ~200KB total content limit

                                             for (const file of prioritizedFiles) {
                                                            try {
                                                                           const content = await githubService.getFileContent(owner, repo, file.path);

                                                                           if (content && content.trim()) {
                                                                                          // Skip very large files or binary-looking content
                                                                                          if (content.length > 10000 || this.isBinaryContent(content)) {
                                                                                                         console.log(`Skipping large or binary file: ${file.path}`);
                                                                                                         continue;
                                                                                          }

                                                                                          if (totalSize + content.length > maxTotalSize) {
                                                                                                         console.log(`Reached size limit, stopping at ${file.path}`);
                                                                                                         break;
                                                                                          }

                                                                                          processedFiles.push({
                                                                                                         path: file.path,
                                                                                                         content: content,
                                                                                                         size: content.length,
                                                                                                         type: this.getFileType(file.path)
                                                                                          });

                                                                                          totalSize += content.length;
                                                                                          console.log(`Processed: ${file.path} (${content.length} chars)`);
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

               filterRelevantFiles(fileTree) {
                              return fileTree.filter(file => {
                                             // Skip if already filtered by GitHubService
                                             if (!file.path || file.size === 0) return false;

                                             // Include if it's a priority file
                                             const filename = file.path.split('/').pop().toLowerCase();
                                             if (this.priorityFiles.some(pf => pf.toLowerCase() === filename)) {
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

                                             // Then by file size (smaller first)
                                             return a.size - b.size;
                              });
               }

               getFilePriority(filename, fullPath) {
                              // Highest priority - configuration and main files
                              if (['package.json', 'requirements.txt', 'cargo.toml', 'go.mod'].includes(filename)) {
                                             return 100;
                              }

                              // High priority - main application files
                              if (['main.py', 'index.js', 'app.js', 'server.js', 'main.js'].includes(filename)) {
                                             return 90;
                              }

                              // High priority - Docker and deployment
                              if (['dockerfile', 'docker-compose.yml', 'docker-compose.yaml'].includes(filename)) {
                                             return 85;
                              }

                              // Medium-high priority - documentation and config
                              if (['readme.md', 'license', 'makefile', '.gitignore'].includes(filename)) {
                                             return 80;
                              }

                              // Medium priority - source files in root or src
                              if (fullPath.startsWith('src/') || !fullPath.includes('/')) {
                                             if (this.isSourceFile(filename)) {
                                                            return 70;
                                             }
                              }

                              // Lower priority - test files
                              if (fullPath.includes('test') || fullPath.includes('spec')) {
                                             return 30;
                              }

                              // Low priority - deep nested files
                              const depth = fullPath.split('/').length;
                              if (depth > 3) {
                                             return 20;
                              }

                              // Default priority
                              return 50;
               }

               isRelevantFile(filePath) {
                              const relevantExtensions = [
                                             // Programming languages
                                             '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
                                             '.py', '.rb', '.go', '.java', '.cpp', '.c', '.cs', '.php',
                                             '.swift', '.kt', '.rs', '.scala', '.clj', '.hs', '.elm',

                                             // Web technologies
                                             '.html', '.css', '.scss', '.sass', '.less', '.styl',

                                             // Configuration files
                                             '.json', '.yaml', '.yml', '.toml', '.ini', '.conf', '.cfg',
                                             '.xml', '.properties',

                                             // Documentation
                                             '.md', '.rst', '.txt', '.adoc',

                                             // Scripts and automation
                                             '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',

                                             // Database
                                             '.sql', '.graphql', '.gql'
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
                                             'eslintrc', 'prettierrc', 'babelrc', 'editorconfig'
                              ];

                              return relevantFiles.some(rf => basename.includes(rf));
               }

               isSourceFile(filename) {
                              const sourceExtensions = [
                                             '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.java',
                                             '.cpp', '.c', '.cs', '.php', '.swift', '.kt', '.rs'
                              ];

                              return sourceExtensions.some(ext => filename.endsWith(ext));
               }

               getFileType(filePath) {
                              const ext = filePath.toLowerCase().split('.').pop();
                              const filename = filePath.split('/').pop().toLowerCase();

                              // Configuration files
                              if (['json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'cfg'].includes(ext)) {
                                             return 'config';
                              }

                              // Documentation
                              if (['md', 'rst', 'txt', 'adoc'].includes(ext) || filename === 'readme') {
                                             return 'documentation';
                              }

                              // Source code
                              if (['js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'go', 'java', 'cpp', 'c', 'cs', 'php'].includes(ext)) {
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

                              // If less than 80% printable characters, consider it binary
                              return ratio < 0.8;
               }
}

module.exports = FileProcessor;
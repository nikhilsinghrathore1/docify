const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');
const fs = require('fs');

class GitHubService {
               constructor(installationId) {
                              this.installationId = installationId;
                              this.octokit = this.createOctokitInstance();
               }

               createOctokitInstance() {
                              const privateKey = fs.readFileSync(process.env.GITHUB_PRIVATE_KEY_PATH, 'utf8');

                              return new Octokit({
                                             authStrategy: createAppAuth,
                                             auth: {
                                                            appId: process.env.GITHUB_APP_ID,
                                                            privateKey: privateKey,
                                                            installationId: this.installationId,
                                             },
                              });
               }

               async getFileTree(owner, repo, branch = 'main') {
                              try {
                                             const { data } = await this.octokit.rest.git.getTree({
                                                            owner,
                                                            repo,
                                                            tree_sha: branch,
                                                            recursive: true,
                                             });

                                             // Filter out directories and large files
                                             return data.tree.filter(item => {
                                                            return item.type === 'blob' &&
                                                                           item.size < 100000 && // Skip files larger than 100KB
                                                                           !this.shouldIgnoreFile(item.path);
                                             });
                              } catch (error) {
                                             console.error('Error fetching file tree:', error);
                                             throw error;
                              }
               }

               shouldIgnoreFile(filePath) {
                              const ignoredPaths = [
                                             'node_modules/',
                                             '.git/',
                                             'dist/',
                                             'build/',
                                             '.next/',
                                             'coverage/',
                                             '.nyc_output/',
                                             'vendor/',
                                             '__pycache__/',
                                             '.env',
                                             '.env.local',
                                             '.env.production',
                                             'yarn.lock',
                                             'package-lock.json',
                                             'composer.lock',
                                             'Pipfile.lock'
                              ];

                              const ignoredExtensions = [
                                             '.log',
                                             '.tmp',
                                             '.cache',
                                             '.DS_Store',
                                             '.gitignore',
                                             '.png',
                                             '.jpg',
                                             '.jpeg',
                                             '.gif',
                                             '.ico',
                                             '.svg',
                                             '.woff',
                                             '.woff2',
                                             '.ttf',
                                             '.eot',
                                             '.mp4',
                                             '.mp3',
                                             '.pdf',
                                             '.zip',
                                             '.tar',
                                             '.gz'
                              ];

                              // Check if file is in ignored paths
                              if (ignoredPaths.some(ignored => filePath.includes(ignored))) {
                                             return true;
                              }

                              // Check if file has ignored extension
                              if (ignoredExtensions.some(ext => filePath.toLowerCase().endsWith(ext))) {
                                             return true;
                              }

                              return false;
               }

               async getFileContent(owner, repo, path) {
                              try {
                                             const { data } = await this.octokit.rest.repos.getContent({
                                                            owner,
                                                            repo,
                                                            path,
                                             });

                                             if (data.type !== 'file') {
                                                            return null;
                                             }

                                             // Decode base64 content
                                             const content = Buffer.from(data.content, 'base64').toString('utf-8');
                                             return content;
                              } catch (error) {
                                             console.error(`Error fetching file content for ${path}:`, error.message);
                                             return null;
                              }
               }

               async updateReadme(owner, repo, content, branch) {
                              try {
                                             // Check if README.md already exists
                                             let sha = null;
                                             try {
                                                            const { data } = await this.octokit.rest.repos.getContent({
                                                                           owner,
                                                                           repo,
                                                                           path: 'README.md',
                                                            });
                                                            sha = data.sha;
                                                            console.log('Found existing README.md, will update it');
                                             } catch (error) {
                                                            if (error.status === 404) {
                                                                           console.log('README.md not found, will create new one');
                                                            } else {
                                                                           throw error;
                                                            }
                                             }

                                             // Create or update README.md
                                             const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
                                                            owner,
                                                            repo,
                                                            path: 'README.md',
                                                            message: 'Auto-generated README by GitHub App',
                                                            content: Buffer.from(content).toString('base64'),
                                                            branch,
                                                            ...(sha && { sha }), // Include SHA if updating existing file
                                             });

                                             console.log(`README.md ${sha ? 'updated' : 'created'} successfully`);
                                             return data;
                              } catch (error) {
                                             console.error('Error updating README.md:', error);
                                             throw error;
                              }
               }

               isRelevantFile(filePath) {
                              const relevantExtensions = [
                                             '.js', '.jsx', '.ts', '.tsx',
                                             '.py', '.rb', '.go', '.java', '.cpp', '.c', '.cs',
                                             '.php', '.swift', '.kt', '.rs', '.scala',
                                             '.json', '.yaml', '.yml', '.toml',
                                             '.md', '.txt', '.rst',
                                             '.html', '.css', '.scss', '.less',
                                             '.sh', '.bash', '.zsh',
                                             '.dockerfile', '.dockerignore',
                                             '.gitignore', '.gitattributes',
                                             'makefile', 'Makefile', 'CMakeLists.txt',
                                             'package.json', 'composer.json', 'requirements.txt',
                                             'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle'
                              ];

                              const fileName = filePath.toLowerCase();
                              const hasRelevantExtension = relevantExtensions.some(ext =>
                                             fileName.endsWith(ext.toLowerCase())
                              );

                              // Special case for files without extensions but with relevant names
                              const relevantFileNames = [
                                             'dockerfile', 'makefile', 'rakefile', 'gemfile', 'procfile'
                              ];

                              const baseName = filePath.split('/').pop().toLowerCase();
                              const hasRelevantName = relevantFileNames.includes(baseName);

                              return hasRelevantExtension || hasRelevantName;
               }
}

module.exports = GitHubService;
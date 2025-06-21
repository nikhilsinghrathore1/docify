const express = require('express');
const crypto = require('crypto');
const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const GitHubService = require('./services/github');
const GeminiService = require('./services/gemini');
const FileProcessor = require('./services/fileProcessor');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
               res.json({
                              status: 'README Generator GitHub App is running (powered by Gemini)',
                              timestamp: new Date().toISOString()
               });
});


function verifyWebhookSignature(req, res, next) {
               const signature = req.get('X-Hub-Signature-256');
               const payload = JSON.stringify(req.body);

               if (!signature) {
                              return res.status(401).send('No signature provided');
               }

               const expectedSignature = 'sha256=' +
                              crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
                                             .update(payload)
                                             .digest('hex');

               if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
                              return res.status(401).send('Invalid signature');
               }

               next();
}

app.post('/webhook', verifyWebhookSignature, async (req, res) => {
               const { headers, body } = req;
               const event = headers['x-github-event'];

               console.log(`Received ${event} event for ${body.repository?.full_name}`);

               // Only handle push events
               if (event !== 'push') {
                              return res.status(200).send('Event ignored');
               }

               // REMOVED: Branch restriction - now allows pushes to any branch
               // if (body.ref !== `refs/heads/${body.repository.default_branch}`) {
               //     console.log('Ignoring push to non-default branch');
               //     return res.status(200).send('Non-default branch ignored');
               // }

               // Extract branch name from ref for logging
               const branchName = body.ref.replace('refs/heads/', '');
               console.log(`Processing push to branch: ${branchName}`);

               // IMPORTANT: Prevent infinite loops by checking if this push was made by the app itself
               const commits = body.commits || [];
               const isAppCommit = commits.some(commit => {
                              // Check if commit author is the app - be more specific
                              const authorName = commit.author?.name || commit.committer?.name || '';
                              const authorEmail = commit.author?.email || commit.committer?.email || '';

                              // More specific checks for app-generated commits
                              return (
                                             // Check for GitHub App bot names (more specific)
                                             authorName.includes('[bot]') ||
                                             // Check for specific app email patterns (not general noreply)
                                             authorEmail.includes('github-actions[bot]@users.noreply.github.com') ||
                                             authorEmail.includes(process.env.GITHUB_APP_ID + '+') || // App-specific email pattern
                                             // Check for specific automated commit message pattern
                                             (commit.message?.includes('[automated]') && commit.message?.includes('Update README.md via GitHub App'))
                              );
               });

               if (isAppCommit) {
                              console.log('Ignoring push made by the app itself to prevent infinite loop');
                              return res.status(200).send('App-generated commit ignored');
               }

               try {
                              await handlePushEvent(body);
                              res.status(200).send('README generation initiated');
               } catch (error) {
                              console.error('Error handling push event:', error);
                              res.status(500).send('Internal server error');
               }
});
async function handlePushEvent(payload) {
               const { repository, installation } = payload;

               if (!installation) {
                              throw new Error('No installation found in payload');
               }

               // Extract the branch name from the ref
               const branchName = payload.ref.replace('refs/heads/', '');
               console.log(`Processing repository: ${repository.full_name} on branch: ${branchName}`);

               // Initialize services
               const githubService = new GitHubService(installation.id);
               const geminiService = new GeminiService();
               const fileProcessor = new FileProcessor();

               try {
                              // 1. Get repository file tree from the pushed branch
                              console.log(`Fetching repository file tree from branch: ${branchName}...`);
                              const fileTree = await githubService.getFileTree(
                                             repository.owner.login,
                                             repository.name,
                                             branchName // Use the actual branch instead of default branch
                              );

                              // 2. Process and filter files
                              console.log('Processing files...');
                              const processedFiles = await fileProcessor.processFiles(
                                             githubService,
                                             repository.owner.login,
                                             repository.name,
                                             fileTree
                              );

                              if (processedFiles.length === 0) {
                                             console.log('No relevant files found to process');
                                             return;
                              }

                              // 3. Generate README content using Gemini
                              console.log('Generating README with Gemini...');
                              const readmeContent = await geminiService.generateReadme(processedFiles, repository);

                              // 4. Update or create README.md on the same branch where the push occurred
                              console.log(`Updating README.md on branch: ${branchName}...`);
                              await githubService.updateReadme(
                                             repository.owner.login,
                                             repository.name,
                                             readmeContent,
                                             branchName, // Use the actual branch instead of default branch
                                             '[automated] Update README.md via GitHub App' // Add automated tag
                              );

                              console.log(`README.md successfully updated on branch: ${branchName}!`);
               } catch (error) {
                              console.error('Error in handlePushEvent:', error);

                              // Enhanced error handling for Gemini-specific issues
                              if (error.response?.status === 400) {
                                             console.error('Gemini API request error - check prompt format or content');
                              } else if (error.response?.status === 403) {
                                             console.error('Gemini API authentication error - check API key');
                              } else if (error.response?.status === 429) {
                                             console.error('Gemini API rate limit exceeded - consider implementing retry logic');
                              }

                              throw error;
               }
}

app.use((error, req, res, next) => {
               console.error('Unhandled error:', error);
               res.status(500).json({ error: 'Internal server error' });
});


app.listen(PORT, () => {
               console.log(`README Generator GitHub App listening on port ${PORT}`);
               console.log('Environment:', process.env.NODE_ENV);

               // Validate environment variables - Updated for Gemini
               const requiredEnvVars = [
                              'GITHUB_APP_ID',
                              'GITHUB_PRIVATE_KEY_PATH',
                              'GITHUB_WEBHOOK_SECRET',
                              'GEMINI_API_KEY'
               ];

               const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
               if (missingVars.length > 0) {
                              console.error('Missing required environment variables:', missingVars);
                              console.error('Make sure to set GEMINI_API_KEY instead of CLAUDE_API_KEY');
                              process.exit(1);
               }

               console.log('All required environment variables are set ✓');
               console.log('Using Gemini AI for README generation');

});
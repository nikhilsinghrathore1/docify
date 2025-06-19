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

               // Ignore pushes to non-default branches (optional - remove if you want all branches)
               if (body.ref !== `refs/heads/${body.repository.default_branch}`) {
                              console.log('Ignoring push to non-default branch');
                              return res.status(200).send('Non-default branch ignored');
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

               console.log(`Processing repository: ${repository.full_name}`);

               // Initialize services
               const githubService = new GitHubService(installation.id);
               const geminiService = new GeminiService(); // Changed from ClaudeService to GeminiService
               const fileProcessor = new FileProcessor();

               try {
                              // 1. Get repository file tree
                              console.log('Fetching repository file tree...');
                              const fileTree = await githubService.getFileTree(
                                             repository.owner.login,
                                             repository.name,
                                             repository.default_branch
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

                              // 4. Update or create README.md
                              console.log('Updating README.md...');
                              await githubService.updateReadme(
                                             repository.owner.login,
                                             repository.name,
                                             readmeContent,
                                             repository.default_branch
                              );

                              console.log('README.md successfully updated!');
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
                              'GEMINI_API_KEY' // Changed from CLAUDE_API_KEY to GEMINI_API_KEY
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
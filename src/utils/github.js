'use strict';

const GitHubApi = require('github');

const github = new GitHubApi({
  protocol: 'https',
  host: 'api.github.com',
  pathPrefix: '/',
  headers: {
    'user-agent': 'GitHub User Stats Application'
  },
  Promise: require('bluebird'),
  timeout: 5000
});

module.exports = (program) => {
  if (program.token) {
    github.authenticate({
      type: 'oauth',
      token: program.token,
    });
  } else if (process.env.GH_USER_STATS_GITHUB_TOKEN) {
    github.authenticate({
      type: 'oauth',
      token: process.env.GH_USER_STATS_GITHUB_TOKEN,
    });
  }

  return github
};

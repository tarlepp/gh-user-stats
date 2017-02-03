'use strict';

const GitHubApi = require('github');

const github = new GitHubApi({
  // optional
  //debug: true,
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
  }

  return github
};

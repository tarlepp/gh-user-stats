#!/usr/bin/env node
'use strict';

const chalk = require('chalk');
const program = require('commander');
const Table = require('cli-table2');
const moment = require('moment');
const Promise = require('bluebird');
const errorHandler = require('./utils/error-handler');
const spinner = require('./utils/spinner');

program
  .description('Collect specified user commit statistics with desired dimension')
  .arguments('<username>')
  .option(
    '-y --year <year>',
    'From which year to start to fetch data',
    /\d+/,
    moment().format('YYYY')
  )
  .option(
    '-d --dimension <value>',
    'Row dimension: month | week | day | weekday | repository , default: month',
    /^(month|week|day|weekday|repository)$/i,
    'month'
  )
  .option(
    '-t --token <token>',
    'GitHub OAuth token, this is needed if you want to make a lot of requests'
  )
  .parse(process.argv);

const args = program.args;

if (!args.length) {
  console.log(chalk.red('Please enter GitHub username'));

  program.help();

  process.exit(1);
}

const github = require('./utils/github')(program);

let rawDataRepositories = [];
let rawDataCommits = {};

console.log(`GitHub commit statistics of user ${chalk.bold(program.args[0])} since ${chalk.bold(program.year)} year start`);

spinner.start();

fetchRepositories(program.args[0])
  .then(results => {
    const promises = results.map(repository => {
      if (repository.isFork) {
        return fetchForkRepository(repository);
      } else {
        return repository;
      }
    });

    return Promise.all(promises);
  })
  .then(results => {
    spinner.stop();
    results = [].concat.apply([], results);

    console.log(`Total number of repositories: ${chalk.bold(results.length)} to check`);

    spinner.start();

    // Initialize
    results.map(repository => {
      rawDataCommits[`${repository.owner}/${repository.name}`] = [];
    });

    Promise.all(results.map(repository => fetchCommits(repository, program.args[0])))
      .then(results => {
        const commits = [].concat.apply([], results);

        const result = [...commits.reduce((hash, {key, date, message, repository, committer}) => {
          let current = hash.get(key) || {key, items: []};

          current.items.push({
            date: date,
            message: message,
            repository: repository,
            committer: committer
          });

          return hash.set(key, current);
        }, new Map).values()];

        spinner.stop();

        console.log(`Total number of commits: ${chalk.bold(commits.length)} found`);

        makeTable(result);
      });
  })
  .catch(error => {
    spinner.stop();

    errorHandler(error);
  });

/**
 * Function to fetch user repositories from GitHub REST API.
 *
 * @param {string}  username
 * @param {int}     [page]
 * @returns {Promise.<TResult>}
 */
function fetchRepositories(username, page) {
  page = page || 1;

  return github.repos
    .getForUser({username: username, page: page, per_page: 100})
    .then(repositories => {
      const fetchNext = github.hasNextPage(repositories);

      rawDataRepositories = rawDataRepositories
        .concat(repositories
          .map(repository => {
            return {
              name: repository.name,
              fullName: repository.full_name,
              owner: repository.owner.login,
              isFork: repository.fork,
            };
          })
        );

      return fetchNext ? fetchRepositories(username, page + 1) : rawDataRepositories;
    });
}

/**
 * Function to fetch specified user commits from given repository.
 *
 * @param {*}       repository
 * @param {string}  username
 * @param {int}     page
 * @returns {Promise.<TResult>}
 */
function fetchCommits(repository, username, page) {
  const repoName = `${repository.owner}/${repository.name}`;

  page = page || 1;

  spinner.setTitle(`Crunching data for ${repoName}... %s`);

  return github.repos
    .getCommits({owner: repository.owner, repo: repository.name, page: page, per_page: 100})
    .then(commits => {
      let fetchNext = github.hasNextPage(commits);

      rawDataCommits[repoName] = rawDataCommits[repoName]
        .concat(commits
          .filter(commit => {
            if (moment(commit.commit.committer.date).format('YYYY') < program.year) {
              fetchNext = false;

              return false;
            }

            return !!(commit.committer && commit.committer.login && commit.committer.login === username);
          })
          .map(commit => {
            const date = moment(commit.commit.committer.date);

            let key;

            switch (program.dimension) {
              case 'repository':
                key = repository.fullName;
                break;
              case 'weekday':
                key = date.format('d dddd');
                break;
              case 'day':
                key = date.format('YYYY-MM-DD');
                break;
              case 'week':
                key = date.format('YYYY-WW');
                break;
              case 'month':
              default:
                key = date.format('YYYY-MM');
                break;
            }

            return {
              key: key,
              date: date,
              message: commit.commit.message,
              committer: commit.commit.committer,
              repository: repository,
            }
          })
        );

      return fetchNext ? fetchCommits(repository, username, page + 1) : rawDataCommits[repoName];
    })
    .catch(error => {
      console.log(repository.fullName);
      console.log(chalk.red(error));

      return rawDataCommits[repoName];
    });
}

function fetchForkRepository(repository) {
  return github.repos
    .get({owner: repository.owner, repo: repository.name})
    .then(result => {
      return [
        {
          name: result.parent.name,
          fullName: result.parent.full_name,
          owner: result.parent.owner.login,
          isFork: result.parent.fork,
        },
        repository
      ];
    });
}

function makeTable(results) {
  const table = new Table({
    head: ['Dimension', 'Commits', 'Repositories'],
  });

  results.sort((a, b) => a.key.localeCompare(b.key));

  results.map(result => {
    let repositories = [...new Set(result.items.map(item => item.repository.fullName))];

    table.push([
      result.key,
      {hAlign: 'right', content: result.items.length},
      repositories.sort().join('\n'),
    ]);
  });

  console.log(table.toString());
}

#!/usr/bin/env node
'use strict';

const chalk = require('chalk');
const program = require('commander');
const Table = require('cli-table3');
const moment = require('moment');
const errorHandler = require('./utils/error-handler');
const spinner = require('./utils/spinner');

program
  .arguments('<username>')
  .option(
    '-d --dimension <value>',
    'Row dimension: month | week | day | weekday , default: month',
    /^(month|week|day|weekday)$/i,
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

let rawData = [];

console.log(`GitHub activity statistics of user ${chalk.bold(program.args[0])}`);

spinner.start();

fetchEvents(program.args[0])
  .then(results => {
    const result = [...results.reduce((hash, {key, type, repo, cnt, date}) => {
      let current = hash.get(key) || {key, items: []};

      current.items.push({
        type: type,
        repo: repo,
        cnt: cnt,
        date: date,
      });

      return hash.set(key, current);
    }, new Map).values()];

    spinner.stop();

    makeTable(result);
  })
  .catch(error => {
    spinner.stop();

    errorHandler(error);
  });

/**
 * Function to fetch GitHub events for specified user.
 *
 * @param {string}  username
 * @param {int}     [page]
 * @returns {Promise.<TResult>}
 */
function fetchEvents(username, page) {
  page = page || 1;

  const validTypes = [
    'CreateEvent',
    'IssueCommentEvent',
    'PullRequestEvent',
    'PushEvent',
  ];

  return github.activity
    .getEventsForUser({username: username, page: page, per_page: 100})
    .then(events => {
      const fetchNext = github.hasNextPage(events);

      rawData = rawData.concat(events.data
        .filter(event => validTypes.includes(event.type))
        .map(event => {
          const date = moment(event.created_at);

          let key;

          switch (program.dimension) {
            case 'weekday':
              key = date.format('d dddd');
              break;
            case 'day':
              key = date.format('YYYY-MM-DD');
              break;
            case 'week':
              key = date.format('YYYY-ww');
              break;
            case 'month':
            default:
              key = date.format('YYYY-MM');
              break;
          }

          return {
            type: event.type,
            repo: event.repo.name,
            cnt: {
              commits: event.payload.commits ? event.payload.commits.length : 0,
              issueComments: event.payload.issue && event.payload.action === 'created' ? 1 : 0,
              created: event.type === 'CreateEvent' ? 1 : 0,
              pullRequest: event.type === 'PullRequestEvent' && event.payload.action === 'opened' ? 1 : 0,
            },
            date: date,
            key: key
          };
        })
      );

      return fetchNext ? fetchEvents(username, page + 1) : rawData;
    });
}

/**
 * Function to print output table.
 *
 * @param {{}[]} results
 */
function makeTable(results) {
  const table = new Table({
    head: ['Dimension', 'Events', 'Commits', 'Issue\ncomments', 'Created', 'PR'],
  });

  results.sort((a, b) => a.key.localeCompare(b.key));

  results.map(result => {
    table.push([
      result.key,
      {hAlign: 'right', content: result.items.length},
      {hAlign: 'right', content: result.items.map(item => item.cnt.commits).reduce((a, b) => a + b, 0)},
      {hAlign: 'right', content: result.items.map(item => item.cnt.issueComments).reduce((a, b) => a + b, 0)},
      {hAlign: 'right', content: result.items.map(item => item.cnt.created).reduce((a, b) => a + b, 0)},
      {hAlign: 'right', content: result.items.map(item => item.cnt.pullRequest).reduce((a, b) => a + b, 0)},
    ]);
  });

  console.log(table.toString());

  [
    {
      'column': 'Events',
      'description': 'Total activity events to GitHub',
    },
    {
      'column': 'Commits',
      'description': 'Actual commit counts',
    },
    {
      'column': 'Issue comments',
      'description': 'Created issue(s) or issue comment(s)',
    },
    {
      'column': 'Created',
      'description': 'Represents a created repository, branch, or tag',
    },
    {
      'column': 'PR',
      'description': 'Opened pull request(s)',
    }
  ].map(section => {
    console.log(`${chalk.bold(section.column)}: ${section.description}`);
  });
}

#!/usr/bin/env node
'use strict';

const chalk = require('chalk');
const program = require('commander');
const Table = require('cli-table2');
const Spinner = require('cli-spinner').Spinner;
const moment = require('moment');

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
let spinner = new Spinner('Crunching data... %s');

spinner.setSpinnerString('|/-\\');
spinner.start();

fetchEvents(program.args[0])
  .then(results => {
    const result = [...results.reduce((hash, {key, type, repo, commits, issueComments, date}) => {
      let current = hash.get(key) || {key, items: []};

      current.items.push({
        type: type,
        repo: repo,
        commits: commits,
        issueComments: issueComments,
        date: date,
      });

      return hash.set(key, current);
    }, new Map).values()];

    spinner.stop(true);

    makeTable(result);
  })
  .catch(error => {
    console.log(chalk.red(error));
  });


function fetchEvents(username, page) {
  page = page || 1;

  const validTypes = [
    'CreateEvent',
    'GistEvent',
    'IssueCommentEvent',
    'PullRequestEvent',
    'PushEvent',
  ];

  return github.activity
    .getEventsForUser({username: username, page: page, per_page: 100})
    .then(events => {
      const fetchNext = github.hasNextPage(events);

      rawData = rawData.concat(events
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
              key = date.format('YYYY-WW');
              break;
            case 'month':
            default:
              key = date.format('YYYY-MM');
              break;
          }

          return {
            type: event.type,
            repo: event.repo.name,
            commits: event.payload.commits ? event.payload.commits.length : 0,
            issueComments: event.payload.issue && event.payload.action === 'created' ? 1 : 0,
            date: date,
            key: key
          };
        })
      );

      if (fetchNext) {
        return fetchEvents(username, page + 1);
      } else {
        return rawData;
      }
    });
}

function makeTable(results) {
  const table = new Table({
    head: ['Dimension', 'Events', 'Commits', 'Issue comments'],
  });

  results.sort((a, b) => a.key.localeCompare(b.key));

  results.map(result => {
    table.push([
      result.key,
      {hAlign: 'right', content: result.items.length},
      {hAlign: 'right', content: result.items.map(item => item.commits).reduce((a, b) => a + b, 0)},
      {hAlign: 'right', content: result.items.map(item => item.issueComments).reduce((a, b) => a + b, 0)},
    ]);
  });

  console.log(table.toString());
}

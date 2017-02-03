#!/usr/bin/env node
'use strict';

const program = require('commander');

program
  .version(require('./../package.json').version)
  .command('events <username>', 'Get user event statistics for 90 days')
  .parse(process.argv);

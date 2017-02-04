'use strict';

const chalk = require('chalk');

module.exports = (error) => {
  try {
    const parsed = JSON.parse(error);

    if (parsed.hasOwnProperty('message')) {
      console.log(chalk.red(parsed.message));
    }

    if (parsed.hasOwnProperty('documentation_url')) {
      console.log(chalk.red(parsed.documentation_url));
    }
  } catch (e) {
    console.log(chalk.red(error));
  }
};

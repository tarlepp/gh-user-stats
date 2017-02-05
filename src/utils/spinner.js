'use strict';

const spinner = new (require('cli-spinner').Spinner)();

spinner.setSpinnerString('⢄⢂⢁⡁⡈⡐⡠');

module.exports = {
  start: function (title) {
    this.setTitle(title);

    spinner.start();
  },

  stop: function () {
    spinner.stop(true);
  },

  setTitle: function (title) {
    title = title || 'Crunching data... %s';

    spinner.setSpinnerTitle(title);
  }
};

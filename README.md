# gh-user-stats
[![License](http://img.shields.io/:license-mit-blue.svg)](LICENSE)
[![GitHub version](https://badge.fury.io/gh/tarlepp%2Fgh-user-stats.svg)](https://badge.fury.io/gh/tarlepp%2Fgh-user-stats)
[![Dependency Status](https://david-dm.org/tarlepp/gh-user-stats.svg)](https://david-dm.org/tarlepp/gh-user-stats)
[![devDependency Status](https://david-dm.org/tarlepp/gh-user-stats/dev-status.svg)](https://david-dm.org/tarlepp/gh-user-stats#info=devDependencies)

Tool to collect specified user statistics from GitHub.

Table of Contents
=================

  * [gh-user-stats](#gh-user-stats)
  * [Table of Contents](#table-of-contents)
    * [Installation](#installation)
    * [Usage](#usage)
    * [<a href="CHANGELOG.md">Change log</a>](#change-log)
    * [Authors](#authors)
    * [LICENSE](#license)


## Installation
```bash
$ npm install -g gh-user-stats
```

## Usage
```bash
$ gh-user-stats
```

## GitHub token
Since GitHub allow to make only 50 requests without authentication per hour it's recommended to run this application 
with token (-t, --token option)

You can easily generate it [here](https://github.com/settings/tokens).

After that you can run application with key `-t [your-40-digit-github-token]`
Or set environment variable `GH_USER_STATS_GITHUB_TOKEN` and specify there your token.

i.e. add to your `~/.bash_profile` or `~/.zshrc` or any other place to load ENV variables string:

```
export GH_USER_STATS_GITHUB_TOKEN="your-40-digit-github-token"
```

## [Change log](CHANGELOG.md)
To re-generate just run

```bash
$ github_changelog_generator
```

## Authors
[Tarmo Leppänen](https://github.com/tarlepp)

## LICENSE
[The MIT License (MIT)](LICENSE)

Copyright (c) 2017 Tarmo Leppänen

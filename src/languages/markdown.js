/*
Language: Markdown
Requires: markdown-inline.js, xml.js
Author: John Crepezzi <john.crepezzi@gmail.com>
Website: http://seejohncode.com/
Category: common
*/

function(hljs) {
  return {
    aliases: ['md', 'mkdown', 'mkd'],
    contains: [
      // headers
      {
        className: 'header-n',
        begin: /^#{3,6}\s*/, end: /$/,
        contains: [ { className: 'header', endsWithParent: true } ]
      },
      {
        className: 'header-2',
        begin: /^##\s*/, end: /$/,
        contains: [ { className: 'header', endsWithParent: true } ]
      },
      {
        className: 'header-1',
        begin: /^#\s*/, end: /$/,
        contains: [ { className: 'header', endsWithParent: true } ]
      },
      {
        className: 'header',
        begin: '^.+?\\n[=-]{2,}$'
      },

      // lists
      {
        className: 'list-item',
        begin: /^[ \t]*([*+-]|(\d+\.))[ \t]+/, end: '$',
        returnBegin: true,
        contains: [
          {
            className: 'bullet',
            begin: /^[ \t]*([*+-]|(\d+\.))[ \t]+/
          },
          {
            subLanguage: 'markdown-inline',
            endsWithParent: true,
            relevance: 0
          }
        ]
      },

      // blockquotes
      {
        className: 'blockquote',
        begin: '^>[ \\t]+', end: '$',
        contains: [
          {
            subLanguage: 'markdown-inline',
            endsWithParent: true,
            relevance: 0
          }
        ]
      },

      // code snippets
      {
        className: 'code',
        begin: '^( {4}|\t)', end: '$',
        relevance: 0
      },

      // horizontal rules
      {
        className: 'horizontal_rule',
        begin: '^[-\\*]{3,}', end: '$'
      },

      // everything else
      {
        begin: '^.', end: '$',
        subLanguage: 'markdown-inline',
        relevance: 0
      },
    ]
  };
}

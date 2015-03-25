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
        className: 'header',
        begin: /^#{3,6}\s+/, end: /$/,
        returnBegin: true,
        contains: [
		  { className: 'header-markup-n', begin: /^#{3,6}\s*/ },
		  { className: 'header-n', endsWithParent: true },
		]
      },
      {
        className: 'header',
        begin: /^##\s+/, end: /$/,
        returnBegin: true,
        contains: [
		  { className: 'header-markup-2', begin: /^##\s*/ },
		  { className: 'header-2', endsWithParent: true },
		]
      },
      {
        className: 'header',
        begin: /^#\s+/, end: /$/,
        returnBegin: true,
        contains: [
		  { className: 'header-markup-1', begin: /^#\s*/ },
		  { className: 'header-1', endsWithParent: true },
		]
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

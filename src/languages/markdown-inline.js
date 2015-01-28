/*
Language: Markdown-inline
Requires: xml.js
Author: John Crepezzi <john.crepezzi@gmail.com>
Website: http://seejohncode.com/
Category: common
*/

function(hljs) {
  return {
    aliases: ['md-inline', 'mkdown-inline', 'mkd-inline'],
    contains: [

      // inline html
      {
        begin: '<', end: '>',
        subLanguage: 'xml',
        relevance: 0
      },

      // strong segments
      {
        className: 'strong-span',
        variants: [
          { begin: '\\*\\*.+?\\*\\*',
            returnBegin: true,
            contains: [ {
              className: 'strong',
              begin: '\\*\\*', end: '\\*\\*',
              excludeBegin: true, excludeEnd: true
            } ]
          },
          { begin: /\b__.+?__\b/,
            returnBegin: true,
            contains: [ {
              className: 'strong',
              begin: /__/, end: /__\b/,
              excludeBegin: true, excludeEnd: true
            } ]
          }
        ]
      },

      // emphasis segments
      {
        className: 'emphasis-span',
        variants: [
          { begin: '\\*.+?\\*',
            returnBegin: true,
            contains: [ {
              className: 'emphasis',
              begin: '\\*', end: '\\*',
              excludeBegin: true, excludeEnd: true
            } ]
          },
          { begin: /\b_.+?_\b/,
            returnBegin: true,
            contains: [ {
              className: 'emphasis',
              begin: /_/, end: /_\b/,
              excludeBegin: true, excludeEnd: true
            } ],
            relevance: 0
          }
        ]
      },

      // inline code snippets
      {
        className: 'code-span',
        begin: '`.+?`',
        returnBegin: true,
        contains: [ {
          className: 'code',
          begin: '`', end: '`',
          excludeBegin: true, excludeEnd: true
        } ]
      },

      // links - title and link
      {
        begin: '\\[.+?\\][\\(\\[].*?[\\)\\]]',
        returnBegin: true,
        contains: [
          {
            className: 'link_label',
            begin: '\\[', end: '\\]',
            excludeBegin: true,
            returnEnd: true,
            relevance: 0
          },
          {
            className: 'link_url',
            begin: '\\]\\(', end: '\\)',
            excludeBegin: true, excludeEnd: true
          },
          {
            className: 'link_reference',
            begin: '\\]\\[', end: '\\]',
            excludeBegin: true, excludeEnd: true
          }
        ],
        relevance: 10
      },

      // link references
      {
        begin: '^\\[\.+\\]:',
        returnBegin: true,
        contains: [
          {
            className: 'link_reference',
            begin: '\\[', end: '\\]:',
            excludeBegin: true, excludeEnd: true,
            starts: {
              className: 'link_url',
              end: '$'
            }
          }
        ]
      }
    ]
  };
}

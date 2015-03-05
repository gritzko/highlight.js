/*
Syntax highlighting with language autodetection.
https://highlightjs.org/
*/

(function(factory) {

  // Setup highlight.js for different environments. First is Node.js or
  // CommonJS.
  if(typeof exports !== 'undefined') {
    factory(exports);
  } else {
    // Export hljs globally even when using AMD for cases when this script
    // is loaded with others that may still expect a global hljs.
    window.hljs = factory({});

    // Finally register the global hljs with AMD.
    if(typeof define === 'function' && define.amd) {
      define([], function() {
        return window.hljs;
      });
    }
  }

}(function(hljs) {

  /* Utility functions */

  function escape(value) {
    return value.replace(/&/gm, '&amp;').replace(/</gm, '&lt;').replace(/>/gm, '&gt;');
  }

  function tag(node) {
    return node.nodeName.toLowerCase();
  }

  function testRe(re, lexeme) {
    var match = re && re.exec(lexeme);
    return match && match.index == 0;
  }

  function blockLanguage(block) {
    var classes = (block.className + ' ' + (block.parentNode ? block.parentNode.className : '')).split(/\s+/);
    classes = classes.map(function(c) {return c.replace(/^lang(uage)?-/, '');});
    return classes.filter(function(c) {return getLanguage(c) || /no(-?)highlight|plain|text/.test(c);})[0];
  }

  function inherit(parent, obj) {
    var result = {}, key;
    for (key in parent)
      result[key] = parent[key];
    if (obj)
      for (key in obj)
        result[key] = obj[key];
    return result;
  }

  /* Stream merging */

  function nodeStream(node) {
    var result = [];
    (function _nodeStream(node, offset) {
      for (var child = node.firstChild; child; child = child.nextSibling) {
        if (child.nodeType == 3)
          offset += child.nodeValue.length;
        else if (child.nodeType == 1) {
          result.push({
            event: 'start',
            offset: offset,
            node: child
          });
          offset = _nodeStream(child, offset);
          // Prevent void elements from having an end tag that would actually
          // double them in the output. There are more void elements in HTML
          // but we list only those realistically expected in code display.
          if (!tag(child).match(/br|hr|img|input/)) {
            result.push({
              event: 'stop',
              offset: offset,
              node: child
            });
          }
        }
      }
      return offset;
    })(node, 0);
    return result;
  }

  function mergeStreams(original, highlighted, value) {
    var processed = 0;
    var result = '';
    var nodeStack = [];

    function selectStream() {
      if (!original.length || !highlighted.length) {
        return original.length ? original : highlighted;
      }
      if (original[0].offset != highlighted[0].offset) {
        return (original[0].offset < highlighted[0].offset) ? original : highlighted;
      }

      /*
      To avoid starting the stream just before it should stop the order is
      ensured that original always starts first and closes last:

      if (event1 == 'start' && event2 == 'start')
        return original;
      if (event1 == 'start' && event2 == 'stop')
        return highlighted;
      if (event1 == 'stop' && event2 == 'start')
        return original;
      if (event1 == 'stop' && event2 == 'stop')
        return highlighted;

      ... which is collapsed to:
      */
      return highlighted[0].event == 'start' ? original : highlighted;
    }

    function open(node) {
      function attr_str(a) {return ' ' + a.nodeName + '="' + escape(a.value) + '"';}
      result += '<' + tag(node) + Array.prototype.map.call(node.attributes, attr_str).join('') + '>';
    }

    function close(node) {
      result += '</' + tag(node) + '>';
    }

    function render(event) {
      (event.event == 'start' ? open : close)(event.node);
    }

    while (original.length || highlighted.length) {
      var stream = selectStream();
      result += escape(value.substr(processed, stream[0].offset - processed));
      processed = stream[0].offset;
      if (stream == original) {
        /*
        On any opening or closing tag of the original markup we first close
        the entire highlighted node stack, then render the original tag along
        with all the following original tags at the same offset and then
        reopen all the tags on the highlighted stack.
        */
        nodeStack.reverse().forEach(close);
        do {
          render(stream.splice(0, 1)[0]);
          stream = selectStream();
        } while (stream == original && stream.length && stream[0].offset == processed);
        nodeStack.reverse().forEach(open);
      } else {
        if (stream[0].event == 'start') {
          nodeStack.push(stream[0].node);
        } else {
          nodeStack.pop();
        }
        render(stream.splice(0, 1)[0]);
      }
    }
    return result + escape(value.substr(processed));
  }

  /* Initialization */

  function compileLanguage(language) {

    function reStr(re) {
        return (re && re.source) || re;
    }

    function langRe(value, global) {
      return new RegExp(
        reStr(value),
        'm' + (language.case_insensitive ? 'i' : '') + (global ? 'g' : '')
      );
    }

    function compileMode(mode, parent) {
      if (mode.compiled)
        return;
      mode.compiled = true;

      mode.keywords = mode.keywords || mode.beginKeywords;
      if (mode.keywords) {
        var compiled_keywords = {};

        var flatten = function(className, str) {
          if (language.case_insensitive) {
            str = str.toLowerCase();
          }
          str.split(' ').forEach(function(kw) {
            var pair = kw.split('|');
            compiled_keywords[pair[0]] = [className, pair[1] ? Number(pair[1]) : 1];
          });
        };

        if (typeof mode.keywords == 'string') { // string
          flatten('keyword', mode.keywords);
        } else {
          Object.keys(mode.keywords).forEach(function (className) {
            flatten(className, mode.keywords[className]);
          });
        }
        mode.keywords = compiled_keywords;
      }
      mode.lexemesRe = langRe(mode.lexemes || /\b\w+\b/, true);

      if (parent) {
        if (mode.beginKeywords) {
          mode.begin = '\\b(' + mode.beginKeywords.split(' ').join('|') + ')\\b';
        }
        if (!mode.begin)
          mode.begin = /\B|\b/;
        mode.beginRe = langRe(mode.begin);
        if (!mode.end && !mode.endsWithParent)
          mode.end = /\B|\b/;
        if (mode.end)
          mode.endRe = langRe(mode.end);
        mode.terminator_end = reStr(mode.end) || '';
        if (mode.endsWithParent && parent.terminator_end)
          mode.terminator_end += (mode.end ? '|' : '') + parent.terminator_end;
      }
      if (mode.illegal)
        mode.illegalRe = langRe(mode.illegal);
      if (mode.relevance === undefined)
        mode.relevance = 1;
      if (!mode.contains) {
        mode.contains = [];
      }
      var expanded_contains = [];
      mode.contains.forEach(function(c) {
        if (c.variants) {
          c.variants.forEach(function(v) {expanded_contains.push(inherit(c, v));});
        } else {
          expanded_contains.push(c == 'self' ? mode : c);
        }
      });
      mode.contains = expanded_contains;
      mode.contains.forEach(function(c) {compileMode(c, mode);});

      if (mode.starts) {
        compileMode(mode.starts, parent);
      }

      var terminators =
        mode.contains.map(function(c) {
          return c.beginKeywords ? '\\.?(' + c.begin + ')\\.?' : c.begin;
        })
        .concat([mode.terminator_end, mode.illegal])
        .map(reStr)
        .filter(Boolean);
      mode.terminators = terminators.length ? langRe(terminators.join('|'), true) : {exec: function(/*s*/) {return null;}};
    }

    compileMode(language);
  }

  /*
  Core highlighting function. Accepts a language name, or an alias, and a
  string with the code to highlight. Returns an object with the following
  properties:

  - relevance (int)
  - value (an HTML string with highlighting markup)

  */
  function highlight(name, value, ignore_illegals, continuation) {
    var language = getLanguage(name),
        continuations = {}, // keep continuations for sub-languages
        result = {
          relevance: 0,
          value: '',
          language: name,
          mode: continuation || language,
          data: { value: '', parent: null, mode: name }
        };

    if (!language) throw new Error('Unknown language: "' + name + '"');
    compileLanguage(language);

    function nodeAppend(node, str, mode) {
      var n;
      if (!str && !mode) {
        // we don't need to do anythign for a blank new node
        return node;
      }
      str = (str || '').toString();
      if (typeof node.value == 'object') {
        if (mode) {
          // new node starts a new mode
          n = { value: str, parent: node, mode: mode };
          node.value.push(n);
        } else {
          // new node is a plain string
          n = node.value[node.value.length - 1];
          if (n.mode || (typeof n.value == 'object')) {
            // last child of old node is not simple: add new node as a sibling to it
            n = { value: str, parent: node };
            node.value.push(n);
          } else {
            // last child of old node is simple: concatenate strings
            n.value += str;
          }
        }
      } else {
        // node has string value
        if (mode) {
          if (!node.value && !node.mode) {
            // old node is blank: overwrite it
            n = node;
            node.value = str;
            node.mode = mode;
          } else if (node.mode || !node.parent) {
            n = { value: str, parent: node, mode: mode };
            if (node.value) {
              // old node has a mode & is not blank: include its contents
              node.value = [ { value: node.value, parent: node }, n ];
            } else {
              // old node is blank: leave its value out (mode kept in parent)
              node.value = [ n ];
            }
          } else {
            // old node is non-blank but modeless: add new node as a sibling to it
            n = { value: str, parent: node.parent, mode: mode };
            node.parent.value.push(n);
          }
        } else {
          // adding string to string: concatenate
          n = node;
          if (str) node.value += str;
        }
      }
      return n;
    }

    function nodeParent(node) {
        while (!node.mode && node.parent) node = node.parent;
        return node.parent || node;
    }

    function keywordMatch(keywords, str) {
      var match_str = language.case_insensitive ? str.toLowerCase() : str;
      return keywords.hasOwnProperty(match_str) && keywords[match_str];
    }

    // GLOBAL options
    function buildSpan(classname, insideSpan, leaveOpen, noPrefix) {
      var classPrefix = noPrefix ? '' : options.classPrefix,
          openSpan    = '<span class="' + classPrefix + classname + '">',
          closeSpan   = leaveOpen ? '' : '</span>';
      return openSpan + insideSpan + closeSpan;
    }

    function processKeywords(result, buffer) {
      var match, last_index = 0;
      result.mode.lexemesRe.lastIndex = 0;
      while (match = result.mode.lexemesRe.exec(buffer)) {
        var str = buffer.substring(last_index, match.index);
        result.data = nodeAppend(result.data, str);
        last_index = result.mode.lexemesRe.lastIndex;
        var keyword_match = keywordMatch(result.mode.keywords, match[0]);
        if (keyword_match) {
          result.relevance += keyword_match[1];
          result.data = nodeParent(nodeAppend(result.data, match[0], keyword_match[0]));
        } else {
          result.data = nodeAppend(result.data, match[0]);
        }
      }
      result.data = nodeAppend(result.data, buffer.substring(last_index));
    }

    // GLOBAL languages
    // VAR continuations
    function processSubLanguage(result, buffer) {
      var sub_result;
      if (result.mode.subLanguage) {
        var cont = continuations[result.mode.subLanguage] || null;
        try { sub_result = highlight(result.mode.subLanguage, buffer, true, cont); }
        catch (e) {
          if (e.message && e.message.indexOf('Unknown language') == 0) {
            result.data = nodeAppend(result.data, buffer);
            return;
          } else throw e;
        }
        if (result.mode.subLanguageMode == 'continuous') {
          continuations[result.mode.subLanguage] = sub_result.mode;
        }
      } else {
        sub_result = highlightAuto(buffer);
      }
      // Counting embedded language score towards the host language may be disabled
      // with zeroing the containing mode relevance. Usecase in point is Markdown that
      // allows XML everywhere and makes every XML snippet to have a much larger Markdown
      // score.
      if (result.mode.relevance > 0) result.relevance += sub_result.relevance;
      result.data = nodeAppend(result.data, sub_result.value, sub_result.language);
      result.data.subLanguage = true;
      result.data = nodeParent(result.data);
    }

    function processBuffer(result, buffer) {
      if (result.mode.subLanguage !== undefined) {
        processSubLanguage(result, buffer);
      } else if (result.mode.keywords) {
        processKeywords(result, buffer);
      } else {
        result.data = nodeAppend(result.data, buffer);
      }
    }

    function processLexeme(result, buffer, lexeme) {
      function subMode(mode, lexeme) {
        for (var i = 0; i < mode.contains.length; i++) {
          if (testRe(mode.contains[i].beginRe, lexeme)) {
            return mode.contains[i];
          }
        }
      }

      function startNewMode(result, mode, lexeme) {
        var markup = mode.className ? buildSpan(mode.className, '', true) : '';
        result.mode = Object.create(mode, { parent: { value: result.mode } });
        if (mode.returnBegin) {
          // HERE
          if (mode.className) result.data = nodeAppend(result.data, '', mode.className);
          return '';
        }
        if (mode.excludeBegin) {
          result.data = nodeAppend(result.data, lexeme);
          if (mode.className) result.data = nodeAppend(result.data, '', mode.className);
          return '';
        }
        if (mode.className) result.data = nodeAppend(result.data, '', mode.className);
        return lexeme;
      }

      function endOfMode(mode, lexeme) {
        if (testRe(mode.endRe, lexeme)) {
          return mode;
        }
        if (mode.endsWithParent) {
          return endOfMode(mode.parent, lexeme);
        }
      }

      var new_mode = subMode(result.mode, lexeme);
      if (new_mode) {
        processBuffer(result, buffer);
        return {
          buffer: startNewMode(result, new_mode, lexeme),
          count: new_mode.returnBegin ? 0 : lexeme.length
        };
      }

      var end_mode = endOfMode(result.mode, lexeme);
      if (end_mode) {
        var origin = result.mode;
        if (!(origin.returnEnd || origin.excludeEnd)) buffer += lexeme;
        processBuffer(result, buffer);
        do {
          if (result.mode.className) result.data = nodeParent(result.data);
          result.relevance += result.mode.relevance;
          result.mode = result.mode.parent;
        } while (result.mode != end_mode.parent);
        if (origin.excludeEnd) {
            result.data = nodeAppend(result.data, lexeme);
        }
        return {
          buffer: end_mode.starts ? startNewMode(result, end_mode.starts, '') : '',
          count: origin.returnEnd ? 0 : lexeme.length
        };
      }

      if (!ignore_illegals && testRe(result.mode.illegalRe, lexeme))
        throw new Error('Illegal lexeme "' + lexeme + '" for mode "' + (result.mode.className || '<unnamed>') + '"');

      // Parser should not reach this point as all types of lexemes should be caught
      // earlier, but if it does due to some bug make sure it advances at least one
      // character forward to prevent infinite looping.
      return {
        buffer: buffer + lexeme,
        count: lexeme.length || 1
      };
    }


    if (continuation) {
      for (var mode = continuation; mode.parent; mode = mode.parent) {
        if (mode.className) {
          result.data = nodeAppend(result.data, '', mode.className);
        }
      }
    }

    try {
      var match, proc = { buffer: '', count: 0 }, index = 0;
      while (true) {
        result.mode.terminators.lastIndex = index;
        match = result.mode.terminators.exec(value);
        if (!match) break;
        proc.buffer += value.substring(index, match.index);
        proc = processLexeme(result, proc.buffer, match[0]);
        index = match.index + proc.count;
      }
      processBuffer(result, proc.buffer + value.substring(index));
    } catch (e) {
      if (e.message && e.message.indexOf('Illegal') == 0) {
        return { relevance: 0, value: escape(value) };
      } else {
        throw e;
      }
    }

    var nodeSpan = function(node) {
          if (node.mode) {
            var cls = (node.subLanguage ? '' : options.classPrefix) + node.mode;
            return '<span class="' + cls + '">' + nodeValue(node) + '</span>';
          } else {
            return nodeValue(node);
          }
        },
        nodeValue = function(node) {
          if (typeof node.value == 'object') {
            return node.value.map(nodeSpan).join('');
          } else {
            return node.subLanguage ? node.value : escape(node.value);
          }
        },
        nodePrint = function(node, indent) {
          if (!indent) indent = '';
          var label = node.mode ? JSON.stringify(node.mode) : '_';
          if (typeof node.value == 'string') {
            console.log(indent + label + ': ' + JSON.stringify(node.value));
          } else {
            console.log(indent + label + ': [');
            if (node.value) for (var i = 0; i < node.value.length; ++i) nodePrint(node.value[i], indent + '    ');
            console.log(indent + ']');
          }
        };

    while (result.data.parent) result.data = result.data.parent;
    //nodePrint(result.data);
    result.value = nodeValue(result.data);

    return result;
  }


  /*
  Highlighting with language detection. Accepts a string with the code to
  highlight. Returns an object with the following properties:

  - language (detected language)
  - relevance (int)
  - value (an HTML string with highlighting markup)
  - second_best (object with the same structure for second-best heuristically
    detected language, may be absent)

  */
  function highlightAuto(text, languageSubset) {
    languageSubset = languageSubset || options.languages || Object.keys(languages);
    var result = {
      relevance: 0,
      value: escape(text)
    };
    var second_best = result;
    languageSubset.forEach(function(name) {
      if (!getLanguage(name)) {
        return;
      }
      var current = highlight(name, text, false);
      current.language = name;
      if (current.relevance > second_best.relevance) {
        second_best = current;
      }
      if (current.relevance > result.relevance) {
        second_best = result;
        result = current;
      }
    });
    if (second_best.language) {
      result.second_best = second_best;
    }
    return result;
  }

  /*
  Post-processing of the highlighted markup:

  - replace TABs with something more useful
  - replace real line-breaks with '<br>' for non-pre containers

  */
  function fixMarkup(value) {
    if (options.tabReplace) {
      value = value.replace(/^((<[^>]+>|\t)+)/gm, function(match, p1 /*..., offset, s*/) {
        return p1.replace(/\t/g, options.tabReplace);
      });
    }
    if (options.useBR) {
      value = value.replace(/\n/g, '<br>');
    }
    return value;
  }

  function buildClassName(prevClassName, currentLang, resultLang) {
    var language = currentLang ? aliases[currentLang] : resultLang,
        result   = [prevClassName.trim()];

    if (!prevClassName.match(/\bhljs\b/)) {
      result.push('hljs');
    }

    if (prevClassName.indexOf(language) === -1) {
      result.push(language);
    }

    return result.join(' ').trim();
  }

  /*
  Applies highlighting to a DOM node containing code. Accepts a DOM node and
  two optional parameters for fixMarkup.
  */
  function highlightBlock(block) {
    var language = blockLanguage(block);
    if (/no(-?)highlight|plain|text/.test(language))
        return;

    var node;
    if (options.useBR) {
      node = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
      node.innerHTML = block.innerHTML.replace(/\n/g, '').replace(/<br[ \/]*>/g, '\n');
    } else {
      node = block;
    }
    var text = node.textContent;
    var result = language ? highlight(language, text, true) : highlightAuto(text);

    var originalStream = nodeStream(node);
    if (originalStream.length) {
      var resultNode = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
      resultNode.innerHTML = result.value;
      result.value = mergeStreams(originalStream, nodeStream(resultNode), text);
    }
    result.value = fixMarkup(result.value);

    block.innerHTML = result.value;
    block.className = buildClassName(block.className, language, result.language);
    block.result = {
      language: result.language,
      re: result.relevance
    };
    if (result.second_best) {
      block.second_best = {
        language: result.second_best.language,
        re: result.second_best.relevance
      };
    }
  }

  var options = {
    classPrefix: 'hljs-',
    tabReplace: null,
    useBR: false,
    languages: undefined
  };

  /*
  Updates highlight.js global options with values passed in the form of an object
  */
  function configure(user_options) {
    options = inherit(options, user_options);
  }

  /*
  Applies highlighting to all <pre><code>..</code></pre> blocks on a page.
  */
  function initHighlighting() {
    if (initHighlighting.called)
      return;
    initHighlighting.called = true;

    var blocks = document.querySelectorAll('pre code');
    Array.prototype.forEach.call(blocks, highlightBlock);
  }

  /*
  Attaches highlighting to the page load event.
  */
  function initHighlightingOnLoad() {
    addEventListener('DOMContentLoaded', initHighlighting, false);
    addEventListener('load', initHighlighting, false);
  }

  var languages = {};
  var aliases = {};

  function registerLanguage(name, language) {
    var lang = languages[name] = language(hljs);
    if (lang.aliases) {
      lang.aliases.forEach(function(alias) {aliases[alias] = name;});
    }
  }

  function listLanguages() {
    return Object.keys(languages);
  }

  function getLanguage(name) {
    return languages[name] || languages[aliases[name]];
  }

  /* Interface definition */

  hljs.highlight = highlight;
  hljs.highlightAuto = highlightAuto;
  hljs.fixMarkup = fixMarkup;
  hljs.highlightBlock = highlightBlock;
  hljs.configure = configure;
  hljs.initHighlighting = initHighlighting;
  hljs.initHighlightingOnLoad = initHighlightingOnLoad;
  hljs.registerLanguage = registerLanguage;
  hljs.listLanguages = listLanguages;
  hljs.getLanguage = getLanguage;
  hljs.inherit = inherit;

  // Common regexps
  hljs.IDENT_RE = '[a-zA-Z]\\w*';
  hljs.UNDERSCORE_IDENT_RE = '[a-zA-Z_]\\w*';
  hljs.NUMBER_RE = '\\b\\d+(\\.\\d+)?';
  hljs.C_NUMBER_RE = '\\b(0[xX][a-fA-F0-9]+|(\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)'; // 0x..., 0..., decimal, float
  hljs.BINARY_NUMBER_RE = '\\b(0b[01]+)'; // 0b...
  hljs.RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';

  // Common modes
  hljs.BACKSLASH_ESCAPE = {
    begin: '\\\\[\\s\\S]', relevance: 0
  };
  hljs.APOS_STRING_MODE = {
    className: 'string',
    begin: '\'', end: '\'',
    illegal: '\\n',
    contains: [hljs.BACKSLASH_ESCAPE]
  };
  hljs.QUOTE_STRING_MODE = {
    className: 'string',
    begin: '"', end: '"',
    illegal: '\\n',
    contains: [hljs.BACKSLASH_ESCAPE]
  };
  hljs.PHRASAL_WORDS_MODE = {
    begin: /\b(a|an|the|are|I|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such)\b/
  };
  hljs.C_LINE_COMMENT_MODE = {
    className: 'comment',
    begin: '//', end: '$',
    contains: [hljs.PHRASAL_WORDS_MODE]
  };
  hljs.C_BLOCK_COMMENT_MODE = {
    className: 'comment',
    begin: '/\\*', end: '\\*/',
    contains: [hljs.PHRASAL_WORDS_MODE]
  };
  hljs.HASH_COMMENT_MODE = {
    className: 'comment',
    begin: '#', end: '$',
    contains: [hljs.PHRASAL_WORDS_MODE]
  };
  hljs.NUMBER_MODE = {
    className: 'number',
    begin: hljs.NUMBER_RE,
    relevance: 0
  };
  hljs.C_NUMBER_MODE = {
    className: 'number',
    begin: hljs.C_NUMBER_RE,
    relevance: 0
  };
  hljs.BINARY_NUMBER_MODE = {
    className: 'number',
    begin: hljs.BINARY_NUMBER_RE,
    relevance: 0
  };
  hljs.CSS_NUMBER_MODE = {
    className: 'number',
    begin: hljs.NUMBER_RE + '(' +
      '%|em|ex|ch|rem'  +
      '|vw|vh|vmin|vmax' +
      '|cm|mm|in|pt|pc|px' +
      '|deg|grad|rad|turn' +
      '|s|ms' +
      '|Hz|kHz' +
      '|dpi|dpcm|dppx' +
      ')?',
    relevance: 0
  };
  hljs.REGEXP_MODE = {
    className: 'regexp',
    begin: /\//, end: /\/[gimuy]*/,
    illegal: /\n/,
    contains: [
      hljs.BACKSLASH_ESCAPE,
      {
        begin: /\[/, end: /\]/,
        relevance: 0,
        contains: [hljs.BACKSLASH_ESCAPE]
      }
    ]
  };
  hljs.TITLE_MODE = {
    className: 'title',
    begin: hljs.IDENT_RE,
    relevance: 0
  };
  hljs.UNDERSCORE_TITLE_MODE = {
    className: 'title',
    begin: hljs.UNDERSCORE_IDENT_RE,
    relevance: 0
  };

  return hljs;
}));

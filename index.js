'use strict';

var postcss = require('postcss');
var objectAssign = require('object-assign');
var pxRegex = require('./lib/pixel-unit-regex');
var filterPropList = require('./lib/filter-prop-list');
var type = require('./lib/type');

var defaults = {
  unit: 'rem',
  rootValue: 16,
  unitPrecision: 5,
  selectorBlackList: [],
  propList: ['font', 'font-size', 'line-height', 'letter-spacing'],
  replace: true,
  mediaQuery: false,
  minPixelValue: 0,
  pxReplace: function() {},
  excludeFiles: []
};

var legacyOptions = {
  'root_value': 'rootValue',
  'unit_precision': 'unitPrecision',
  'selector_black_list': 'selectorBlackList',
  'prop_white_list': 'propList',
  'media_query': 'mediaQuery',
  'propWhiteList': 'propList'
};

module.exports = postcss.plugin('postcss-px2unit', function (options) {
  if (!type.isArray(options)) options = [options]
  return function (css) {
    let selectOption = null;
    for (let i = 0; i < options.length; i++) {
      let option = options[i];
      convertLegacyOptions(option);
      const opts = objectAssign({}, defaults, option);
      const excludeFiles = opts.excludeFiles;
      const filePath = css.source.input.file;
      let exclude = false;
      if (excludeFiles.length !== 0) {
        for (let j = 0; j < excludeFiles.length; j++) {
          const item = excludeFiles[j];
          if ((type.isString(item) && filePath.indexOf(item) !== -1) || (filePath.match(item) !== null)) {
            exclude = true;
            break;
          }
        }
      }
      if (exclude) {
        continue;
      }
      selectOption = opts
    }
    if (!selectOption) return
    var opts = selectOption;
    var pxReplace = null;
    var replaceFunction = null;
    if (type.isFunction(opts.pxReplace)) {
      replaceFunction = opts.pxReplace(opts);
    }
    if (type.isFunction(replaceFunction)) {
      pxReplace = replaceFunction;
    } else {
      pxReplace = createPxReplace(opts.rootValue, opts.unitPrecision, opts.minPixelValue, opts.unit);
    }
    var satisfyPropList = createPropListMatcher(opts.propList);
    css.walkDecls(function (decl, i) {
      // This should be the fastest test and will remove most declarations
      if (decl.value.indexOf('px') === -1) return;

      if (!satisfyPropList(decl.prop)) return;

      if (blacklistedSelector(opts.selectorBlackList, decl.parent.selector)) return;

      var value = decl.value.replace(pxRegex, pxReplace);

      // if rem unit already exists, do not add or replace
      if (declarationExists(decl.parent, decl.prop, value)) return;

      if (opts.replace) {
        decl.value = value;
      } else {
        decl.parent.insertAfter(i, decl.clone({
          value: value
        }));
      }
    });
    if (opts.mediaQuery) {
      css.walkAtRules('media', function (rule) {
        if (rule.params.indexOf('px') === -1) return;
        rule.params = rule.params.replace(pxRegex, pxReplace);
      });
    }
  };
});

function convertLegacyOptions(options) {
  if (typeof options !== 'object') return;
  if (
    (
      (typeof options['prop_white_list'] !== 'undefined' && options['prop_white_list'].length === 0) ||
      (typeof options.propWhiteList !== 'undefined' && options.propWhiteList.length === 0)
    ) &&
    typeof options.propList === 'undefined'
  ) {
    options.propList = ['*'];
    delete options['prop_white_list'];
    delete options.propWhiteList;
  }
  Object.keys(legacyOptions).forEach(function (key) {
    if (options.hasOwnProperty(key)) {
      options[legacyOptions[key]] = options[key];
      delete options[key];
    }
  });
}

function createPxReplace(rootValue, unitPrecision, minPixelValue, unit) {
  return function (m, $1) {
    if (!$1) return m;
    var pixels = parseFloat($1);
    if (pixels < minPixelValue) return m;
    var fixedVal = toFixed((pixels / rootValue), unitPrecision);
    return (fixedVal === 0) ? '0' : fixedVal + unit;
  };
}

function toFixed(number, precision) {
  var multiplier = Math.pow(10, precision + 1),
    wholeNumber = Math.floor(number * multiplier);
  return Math.round(wholeNumber / 10) * 10 / multiplier;
}

function declarationExists(decls, prop, value) {
  return decls.some(function (decl) {
    return (decl.prop === prop && decl.value === value);
  });
}

function blacklistedSelector(blacklist, selector) {
  if (typeof selector !== 'string') return;
  return blacklist.some(function (regex) {
    if (typeof regex === 'string') return selector.indexOf(regex) !== -1;
    return selector.match(regex);
  });
}

function createPropListMatcher(propList) {
  var hasWild = propList.indexOf('*') > -1;
  var matchAll = (hasWild && propList.length === 1);
  var lists = {
    exact: filterPropList.exact(propList),
    contain: filterPropList.contain(propList),
    startWith: filterPropList.startWith(propList),
    endWith: filterPropList.endWith(propList),
    notExact: filterPropList.notExact(propList),
    notContain: filterPropList.notContain(propList),
    notStartWith: filterPropList.notStartWith(propList),
    notEndWith: filterPropList.notEndWith(propList)
  };
  return function (prop) {
    if (matchAll) return true;
    return (
      (
        hasWild ||
        lists.exact.indexOf(prop) > -1 ||
        lists.contain.some(function (m) {
          return prop.indexOf(m) > -1;
        }) ||
        lists.startWith.some(function (m) {
          return prop.indexOf(m) === 0;
        }) ||
        lists.endWith.some(function (m) {
          return prop.indexOf(m) === prop.length - m.length;
        })
      ) &&
      !(
        lists.notExact.indexOf(prop) > -1 ||
        lists.notContain.some(function (m) {
          return prop.indexOf(m) > -1;
        }) ||
        lists.notStartWith.some(function (m) {
          return prop.indexOf(m) === 0;
        }) ||
        lists.notEndWith.some(function (m) {
          return prop.indexOf(m) === prop.length - m.length;
        })
      )
    );
  };
}

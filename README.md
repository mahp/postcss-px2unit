# postcss-px2unit

A plugin for [PostCSS](https://github.com/ai/postcss) that generates rem/em/px units from pixel units.

## Install

```shell
$ npm install postcss-px2unit --save-dev
```

## Usage

Pixels are the easiest unit to use (*opinion*). The only issue with them is that they don't let browsers change the default font size of 16. This script converts every px value to a rem from the properties you choose to allow the browser to set the font size.


### Input/Output

*With the default settings, only font related properties are targeted.*

```css
// input
h1 {
    margin: 0 0 20px;
    font-size: 32px;
    line-height: 1.2;
    letter-spacing: 1px;
}

// output
h1 {
    margin: 0 0 20px;
    font-size: 2rem;
    line-height: 1.2;
    letter-spacing: 0.0625rem;
}
```

### Example

```js
var fs = require('fs');
var postcss = require('postcss');
var px2unit = require('postcss-px2unit');
var css = fs.readFileSync('main.css', 'utf8');
var options = {
    replace: false
};
var processedCss = postcss(px2unit(options)).process(css).css;

fs.writeFile('main-rem.css', processedCss, function (err) {
  if (err) {
    throw err;
  }
  console.log('Rem file written.');
});
```

### options

Type: `Object | Object[] | Null`  
Default:
```js
{
    unit: 'rem',
    rootValue: 16,
    unitPrecision: 5,
    propList: ['font', 'font-size', 'line-height', 'letter-spacing'],
    selectorBlackList: [],
    replace: true,
    mediaQuery: false,
    minPixelValue: 0,
    pxReplace: function(options) {},
    excludeFiles: []
}
```
Array options: 
```js
[
  {
    unit: 'rem',
    rootValue: 16,
    unitPrecision: 5,
    propList: ['font', 'font-size', 'line-height', 'letter-spacing'],
    selectorBlackList: [],
    replace: true,
    mediaQuery: false,
    minPixelValue: 0,
    pxReplace: function(options) {},
    excludeFiles: ['/src/']
  },
  {
    unit: 'rem',
    rootValue: 32,
    unitPrecision: 5,
    propList: ['font', 'font-size', 'line-height', 'letter-spacing'],
    selectorBlackList: [],
    replace: true,
    mediaQuery: false,
    minPixelValue: 0,
    pxReplace: function(options) {},
    excludeFiles: [/node_moduels\/vant/]
  }
]
```

- `unit` (String) Conversion unit: `rem`、`em`、`px`.
- `rootValue` (Number) The root element font size.
- `unitPrecision` (Number) The decimal numbers to allow the REM units to grow to.
- `propList` (Array) The properties that can change from px to rem.
    - Values need to be exact matches.
    - Use wildcard `*` to enable all properties. Example: `['*']`
    - Use `*` at the start or end of a word. (`['*position*']` will match `background-position-y`)
    - Use `!` to not match a property. Example: `['*', '!letter-spacing']`
    - Combine the "not" prefix with the other prefixes. Example: `['*', '!font*']` 
- `selectorBlackList` (Array) The selectors to ignore and leave as px.
    - If value is string, it checks to see if selector contains the string.
        - `['body']` will match `.body-class`
    - If value is regexp, it checks to see if the selector matches the regexp.
        - `[/^body$/]` will match `body` but not `.body`
- `replace` (Boolean) replaces rules containing rems instead of adding fallbacks.
- `mediaQuery` (Boolean) Allow px to be converted in media queries.
- `minPixelValue` (Number) Set the minimum pixel value to replace.
- `pxReplace` (Function) px replace regExp Function, must be return function.
```js
var pxRegex = /"[^"]+"|'[^']+'|url\([^\)]+\)|(\d*\.?\d+)px/g;
var pxRePlace = function (options) {
  return function (m, $1) {
    if (!$1) return m;
    var pixels = parseFloat($1);
    if (pixels < options.minPixelValue) return m;
    var fixedVal = toFixed((pixels /options.rootValue), options.unitPrecision);
    return (fixedVal === 0) ? '0' : fixedVal + options.unit;
  };
} 
// replace
value.replace(pxRegex, pxReplace());
```
- `excludeFiles` (Array<String|Regexp>) Set exclude files.

### Use with gulp-postcss and autoprefixer

```js
var gulp = require('gulp');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var px2unit = require('postcss-px2unit');

gulp.task('css', function () {

    var processors = [
        autoprefixer({
            browsers: 'last 1 version'
        }),
        px2unit([
          {
            rootValue: 16,
            excludeFiles: ['/src/']
          },
          {
            rootValue: 32,
            excludeFiles: [/node_modules\/vant/]
          }
        ])
    ];

    return gulp.src(['build/css/**/*.css'])
        .pipe(postcss(processors))
        .pipe(gulp.dest('build/css'));
});
```

### A message about ignoring properties
Currently, the easiest way to have a single property ignored is to use a capital in the pixel unit declaration.

```css
// `px` is converted to `rem`
.convert {
    font-size: 16px; // converted to 1rem
}

// `Px` or `PX` is ignored by `postcss-px2unit` but still accepted by browsers
.ignore {
    border: 1Px solid; // ignored
    border-width: 2PX; // ignored
}
```

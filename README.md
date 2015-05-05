# mkLib

mkLib is a small and simple library to build your CommonJS/Node modules in a single file that can be used by the browser. The process is:
  - Analyze your module dependencies
  - Each dependant module is wrapped in a closure receiving it's dependencies as arguments
  - All those modules are order according to their dependencies
  - Optionally, a licence comment is added to the begining of the result file
  - The final code is wrapped in a export method to CommonJS, AMD and browser
  - All this is written beautified to a file and also minified to a .min.js file

For simplicity, mkLib assume that every require is assigned to a variable with the same name that the module itsef.
```Javascript
var <MODULE> = require(PATH/<MODULE>.js);
```

### Using mkLib
You can  install mkLib globally and use it from the command line
```Javascript
npm install mkLib -g
mkLib "<INPUT_FILE>" "<OUTPUT_FILE>" "<OPTIONAL_LICENCE_FILE>"
```
or use it from whithin your code
```Javascript
var mkLib = require('mkLib');
mkLib("<INPUT_FILE>", "<OUTPUT_FILE>", "<OPTIONAL_LICENCE_FILE>");
```

It sounds like browserify you might say... And it really does but browserify includes some extra code of code to call your modules and loads them on demand while the point of mkLib is to create a self contained library in a single file.

### Version
0.0.1

### License
MIT
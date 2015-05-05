/*jslint node: true */
"use strict";

var fs = require('fs'),
 	jshint = require("jshint").JSHINT,
	beautify = require('js-beautify'),
	uglify = require('uglify-js'),
	RequireModule = require('./RequireModule'),
	requireRegex = new RegExp('\\t*(.*)require\\s*\\((\'|")(.+)(\'|")\\)(,|;)');

function mkLib(input, output, license) {
	var library = '';
	if (!input) {
		console.log('No input file was provided.');
		process.exit(1);
	}
	if (!output) {
		console.log('No output file was provided.');
		process.exit(1);
	}
	if (license) {
		try {
			library += '/* @preserve\n';
			var license = fs.readFileSync(license, 'utf8').split('\n');
			for (var i = 0; i < license.length; i++) {
				library += ' * ' + license[i] + '\n';
			};
			library += '*/';
		} catch(err) {
			console.log('Couldn\'t load the license file.');
			process.exit(1);
		}
	}

	var requireModule = getRequireModule(input).calculateIncludes();

	library += '(function (root, factory) {\n' + 
			'	if (typeof exports === \'object\') {\n' +
			'		factory(module.exports);\n' +
			'	} else if (typeof define === \'function\' && define.amd) {\n' +
			'		define([\'exports\'], factory);\n' +
			'	} else {\n' +
			'		factory(root);\n' +
			'	}\n' +
			'})(this, function(exports) {\n' +
			'	"use strict";\n';
	var indent = '\t',
		line,
		module,
		i;

	for (i = 0; i < requireModule.include.length; i++) {
		library += requireModule.include[i].print(indent);
	}
	for (i = 0; i < requireModule.content.length; i++) {
		line = requireModule.content[i];
		module = requireRegex.exec(line);
		if (module) {
			library += '\n\t' + module[1] + getFileName(module[3]) + ';';
		}
	}
	library += '\n});';

	writeLibraryToFile(library, output);
}

function getRequireModule(file, parent, modules) {
	modules = modules ||{};
	var name = getFileName(file),
		content,
		lines,
		line,
		requireModule = modules[name],
		alreadyExist = !!requireModule,
		submoduleFile,
		path;

	requireModule = requireModule || new RequireModule(name);
	if (parent) { parent.addDependency(requireModule); }

	if (!alreadyExist) {
		try {
			content = fs.readFileSync(file, 'utf8');
		} catch(err) {
			console.log('Couldn\'t load the file ' + file + '.');
			process.exit(1);
		}
		lines = content.split('\n');

		if (~content.substr(0, content.indexOf('\n')).indexOf('require: off')) {
			return requireModule;
		}

		for (var i = 0; i < lines.length; i++) {
			line = lines[i];
			requireModule.content.push(line);
			submoduleFile = (requireRegex.exec(line) || [])[3];
			if (!submoduleFile) { continue; }
			path = file.lastIndexOf('/');
			if (path === -1)  {
				path = file.lastIndexOf('\\');
			}
			submoduleFile = path !== -1 ? file.slice(0, path) + '/' + submoduleFile : submoduleFile;
			requireModule.addDependency(getRequireModule(submoduleFile, requireModule, modules));
		}
		modules[name] = requireModule;
	}

	return requireModule;
}

function getFileName(file) {
	return file.slice(file.lastIndexOf('/') + 1).replace('.js', '');
}

function writeLibraryToFile(library, file) {
	createPath(file);
	library = beautify(library, { indent_size: 2 });

	fs.writeFile(
		file,
		library, 
		function (err) {
			if (err) throw err;
			console.log('Library succesfully created!');
		}
	);
	fs.writeFile(
		file.replace('.js', '.min.js'),
		uglify.minify(library, {fromString: true}).code,
		function (err) {
			if (err) throw err;
			console.log('Library succesfully minified!');
		}
	);
}

function createPath(path) {
	var pathTokens = path.split('/'),
		currentPath = '';
	if (path.length) {
		pathTokens = path.split('\\');
	}
	for (var i = 0; i < pathTokens.length - 1; i++) {
		currentPath += pathTokens[i] + '/';
		try { fs.mkdirSync(currentPath); } catch(err) { }
	}
}

module.exports = mkLib;
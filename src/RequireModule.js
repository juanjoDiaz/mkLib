/*jslint node: true */
"use strict";

var requireRegex = new RegExp('\\t*(.*)require\\s*\\((\'|")(.+)(\'|")\\)(,|;)'),
	exportRegex = new RegExp('.*module.exports =\\s*(.*)');

function RequireModule(name) {
	this.name = name;
	this.depth = 0;
	this.content = [];
	this.usages = [];
	this.dependencies = {
		direct: {},
		indirect: {}
	};
	this.include = [];
}

RequireModule.prototype.updateDepth = function (depth) {
	if (this.depth < depth) {
		this.depth = depth;
		depth++;
		for (var dependency in this.dependencies.direct) {
			this.dependencies.direct[dependency].updateDepth(depth);
		}
	}
};

RequireModule.prototype.addDependency = function (requireModule) {
	requireModule.usages.push(this.name);
	this.dependencies.direct[requireModule.name] = requireModule;
	this.addIndirectDependency(requireModule);

	requireModule.updateDepth(this.depth + 1);
};

RequireModule.prototype.addIndirectDependency = function (requireModule) {
	if (this.usages.indexOf(requireModule.name) !== -1) {
		console.log('Detected circular reference in ' + this.name);
		process.exit(1);
	}
	if (this.dependencies.indirect[requireModule.name]) {
		this.dependencies.indirect[requireModule.name].count++;
	} else {
		this.dependencies.indirect[requireModule.name] = { requireModule: requireModule, count: 1 };
	}

	var dependency;
	for (var dependencyName in requireModule.dependencies.indirect) {
		dependency = requireModule.dependencies.indirect[dependencyName];
		if (this.dependencies.indirect[dependencyName]) {
			this.dependencies.indirect[dependencyName].count += dependency.count;
		} else {
			this.dependencies.indirect[dependencyName] = { 
				requireModule: dependency.requireModule,
				count: dependency.count
			};
		}
	}
};

RequireModule.prototype.calculateIncludes = function (modules) {
	var include,
		indirectDependencyModel,
		directDependencyModel,
		directDependency;
	modules = modules || [];
	for (var indirectDependency in this.dependencies.indirect) {
		if (~modules.indexOf(indirectDependency)) { continue; }
		include = true;
		indirectDependencyModel = this.dependencies.indirect[indirectDependency];
		for (directDependency in this.dependencies.direct) {
			directDependencyModel = this.dependencies.direct[directDependency].dependencies.indirect[indirectDependency];
			if (directDependencyModel && indirectDependencyModel.count === directDependencyModel.count) {
				include = false;
			}
		}
		if (include) {
			modules.push(indirectDependency);
			this.include.push(indirectDependencyModel.requireModule);
		}
	}

	this.include.sort(function compare(a, b) {
		if (a.depth > b.depth) { return -1;}
		if (a.depth < b.depth) { return 1; }
		return 0;
	});

	for (directDependency in this.dependencies.direct) {
		this.dependencies.direct[directDependency].calculateIncludes(modules);
	}
	return this;
};

RequireModule.prototype.print = function (indent, wrapper) {
	var includes = [],
		include,
		line,
		submoduleFile,
		result = '',
		dependencies = '',
		xport,
		xportFound = false,
		i;
	indent += '\t';

	for (i = 0; i < this.include.length; i++) {
		include = this.include[i];
		includes.push(include.name);
		result += include.print(indent);
	}
	for (i = 0; i < this.content.length; i++) {
		line = this.content[i];
		xport = exportRegex.exec(line);
		if (xport) {
			if (xportFound) {
				throw new Error('More than one export found in the module "' + this.name + '"');
			}
			xportFound = true;
			result += indent + 'return ' + xport[1] + '\n';
		} else if (!requireRegex.exec(line) && 
			line.indexOf('/* jslint node: true */') === -1 && 
			line.indexOf('"use strict";') === -1) {
			result += indent + line;
		}
	}

	for (var dependency in this.dependencies.indirect) {
		if (includes.indexOf(dependency) === -1) {
			dependencies += dependency + ',';
		}
	}
	dependencies = dependencies.substring(0, dependencies.length-1);

	result = indent + 'var ' + this.name + ' = (function (' + dependencies + ') {\n' +
		result +
		'\n' + indent + '})(' + dependencies + ');\n';

	return result;
};

module.exports = RequireModule;
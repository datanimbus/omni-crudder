const parseMongoFilter = {
    IsString: function (val) {
        return val && val.constructor.name === 'String';
    },
    CreateRegexp: function (str) {
        if (str.charAt(0) === '/' &&
            str.charAt(str.length - 1) === '/') {
            var text = str.substr(1, str.length - 2).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            return new RegExp(text, 'i');
        } else {
            return str;
        }
    },
    IsArray: function (arg) {
        return arg && arg.constructor.name === 'Array';
    },
    IsObject: function (arg) {
        return arg && arg.constructor.name === 'Object';
    },
    ResolveArray: function (arr) {
        for (var x = 0; x < arr.length; x++) {
            if (this.IsObject(arr[x])) {
                arr[x] = this.FilterParse(arr[x]);
            } else if (this.IsArray(arr[x])) {
                arr[x] = this.ResolveArray(arr[x]);
            } else if (this.IsString(arr[x])) {
                arr[x] = this.CreateRegexp(arr[x]);
            }
        }
        return arr;
    },
    /*
     * Takes the filter field and parses it to a JSON object
     * @type {function}
     *  
     */
    FilterParse: function (filterParsed) {
        for (var key in filterParsed) {
            if (this.IsString(filterParsed[key])) {
                filterParsed[key] = this.CreateRegexp(filterParsed[key]);
            } else if (this.IsArray(filterParsed[key])) {
                filterParsed[key] = this.ResolveArray(filterParsed[key]);
            } else if (this.IsObject(filterParsed[key])) {
                filterParsed[key] = this.FilterParse(filterParsed[key]);
            }
        }
        return filterParsed;
    }
};

const parseSQLFilter = {
    IsString: function (val) {
        return val && val.constructor.name === 'String';
    },
    CreateRegexp: function (str) {
        if (str.charAt(0) === '/' &&
            str.charAt(str.length - 1) === '/') {
            var text = str.substr(1, str.length - 2).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            return new RegExp(text, 'i');
        } else {
            return str;
        }
    },
    IsArray: function (arg) {
        return arg && arg.constructor.name === 'Array';
    },
    IsObject: function (arg) {
        return arg && arg.constructor.name === 'Object';
    },
    ResolveArray: function (arr) {
        for (var x = 0; x < arr.length; x++) {
            if (this.IsObject(arr[x])) {
                arr[x] = this.FilterParse(arr[x]);
            } else if (this.IsArray(arr[x])) {
                arr[x] = this.ResolveArray(arr[x]);
            } else if (this.IsString(arr[x])) {
                arr[x] = this.CreateRegexp(arr[x]);
            }
        }
        return arr;
    },
    /*
     * Takes the filter field and parses it to a JSON object
     * @type {function}
     *  
     */
    FilterParse: function (filterParsed) {
        for (var key in filterParsed) {
            if (this.IsString(filterParsed[key])) {
                filterParsed[key] = this.CreateRegexp(filterParsed[key]);
            } else if (this.IsArray(filterParsed[key])) {
                filterParsed[key] = this.ResolveArray(filterParsed[key]);
            } else if (this.IsObject(filterParsed[key])) {
                filterParsed[key] = this.FilterParse(filterParsed[key]);
            }
        }
        return filterParsed;
    }
}

module.exports = {
    parseMongoFilter: parseMongoFilter,
    parseSQLFilter: parseSQLFilter
};
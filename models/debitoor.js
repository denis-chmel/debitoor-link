var async = require('async');
var config = require('../config.json');
var request = require('request');
var access_token;

/**
 * @todo unteach from "req" param
 * @param req
 * @returns {*}
 */
exports.getAccessToken = function(req){ // TODO not good it requires req :(
    //return "eyJ1c2VyIjoiNTMxZDk5YzQ4ZTA2MzdlYjdjMDAzZTFkIiwiYXBwIjoiNTMxZDlhMjczMzQ4ZTZlNjY1MDAwZTEyIiwiY2hhbGxlbmdlIjoxLCIkZSI6MH0KwpbCi8ORw6p-woHCksO6H8KlCcK4w47DjUwf";
    if (req) { // XXX caching to not require "req" always
        access_token = req.session.auth ? req.session.auth.access_token : null;
    }
    return access_token;
};

/**
 * Send request to debitoor API with token.
 * @param options
 * @param callback
 * @returns {*}
 */
exports.request = function(options, callback) {
    options.uri = config.debitoor.api_url + options.uri;
    options.headers = options.headers || {};
    options.headers['x-token'] = module.exports.getAccessToken();
    return request(options, callback);
};

exports.loadCustomers = function(callback) {
    module.exports.request(
        {
            uri: "/customers"
        },
        function(error, response, body) {
            var customers = JSON.parse(body);
            customers = customers.filter(function(customer) {
                return !customer.isArchived;
            });
            //res.render('customers', { customers: customers });
            callback(customers);
        }
    );
};

exports.addCustomer = function(customerData, callback) {
    module.exports.request({
        uri: '/customers?autonumber=true',
        method: 'POST',
        body: JSON.stringify(customerData)
    }, function(_err, _res) {
        callback(_err, _res);
    });
};

exports.deleteCustomerById = function(customerId, callback) {
    module.exports.request({
            uri: "/customers/" + customerId
        },
        function(_err, _res, body) {
            if (_res.statusCode != 200) {
                callback("Customer was not found. Maybe already deleted?");
                return;
            }
            var customerData = JSON.parse(body);
            customerData.isArchived = true;
            module.exports.request({
                uri: '/customers/' + customerId,
                method: 'PUT',
                body: JSON.stringify(customerData)
            }, function(_err, _res) {
                var error = "";
                if (_res.statusCode != 200) {
                    error = "Couldn't delete customer"; // TODO in case token is wrong - should ever happen?
                }
                callback(error);
            });
        }
    );
};

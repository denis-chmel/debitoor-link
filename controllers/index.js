var config = require('../config.json');
var fs = require('fs');
var request = require('request');
var async = require('async');
var debitoor = require('../models/debitoor');

/**
 * Returns true if the passed value is found in the array, false otherwise.
 * @param value
 * @returns {boolean}
 */
Array.prototype.inArray = function(value) {
    var i;
    for (i = 0; i < this.length; i++) {
        if (this[i] == value) {
            return true;
        }
    }
    return false;
};

exports.index = function(req, res) {

    if (debitoor.getAccessToken(req)) {
        return module.exports.customers(req, res);
    }

    var authCode = req.query.code;
    if (!authCode) {
        return res.redirect(
            'https://app.debitoor.com/login/oauth2/authorize?client_id=' + config.debitoor.client_id + '&response_type=code'
        );
    }

    // Request for auth token
    return request.post(
        'https://app.debitoor.com/login/oauth2/access_token',
        {
            form: {
                code: authCode,
                client_secret: config.debitoor.client_secret,
                redirect_uri: config.baseUrl
            }
        },
        function(error, response, body) {
            if (!error && response.statusCode == 200) {
                req.session.auth = JSON.parse(body);
                req.flash('success', 'Welcome back, username!');
                res.redirect(config.baseUrl);
            } else {
                // TODO catch errors, show message
            }
        }
    );

};

exports.logout = function(req, res) {
    delete req.session.auth;

    res.redirect('back');
};

exports.customersDeleteAll = function(req, res) {

    if (!debitoor.getAccessToken()) {
        return module.exports.page401(req, res);
    }

    debitoor.loadCustomers(function(customers) {
        async.forEachLimit(
            customers,
            4, // no more than 4 customer update requests at a time
            function(customer, callback) {
                debitoor.deleteCustomerById(
                    customer.id,
                    function(_err, _res) {
                        callback();
                    }
                );
            },
            function() {
                req.flash('success', "Successfully removed all customers");
                res.redirect(config.baseUrl);
            }
        );
    });
};

exports.customerDelete = function(req, res) {
    debitoor.deleteCustomerById(
        req.params.id,
        function(error) {
            if (error) {
                req.flash('error', error);
                res.redirect('back')
            } else {
                req.flash('success', "Customer was successfully deleted");
            }
            res.redirect(config.baseUrl);
        }
    );
};

exports.customers = function(req, res) {

    debitoor.loadCustomers(function(customers) {
        res.render('customers', { customers: customers });
    });

};

exports.page404 = function(req, res) {
    res.status(404);
    res.render('page404');
};

exports.page401 = function(req, res) {
    res.status(401);
    res.render('page401');
};

exports.uploadCsv = function(req, res) {

    if (!debitoor.getAccessToken()) {
        return module.exports.page401(req, res);
    }
    var csv = require('csv');

    if (req.method == 'GET') {
        return res.render('upload');
    }

    return fs.readFile(req.files.csvFile.path, function(err, data) {

        debitoor.loadCustomers(function(customers) {

            var knownEmails = [];
            for (var i in customers) {
                if (!customers.isArchived) {
                    knownEmails.push(customers[i].email);
                }
            }

            var validCustomersFound = [];
            var missingCustomers = [];
            csv()
                .from.path(req.files.csvFile.path, { delimiter: ',', escape: '"' })
                .on('record',function(line) {
                    var customer = {
                        name: line[0],
                        email: line[1],
                        countryCode: line[2],
                        paymentTermsId: parseInt(line[3])
                    };
                    if (customer.paymentTermsId && customer.email && customer.email.indexOf("@") > 0) { // TODO do a more serious email check
                        validCustomersFound.push(customer);
                        if (false == knownEmails.inArray(customer.email)) {
                            missingCustomers.push(customer);
                        }
                    }
                }).on('end', function(linesCount) {
                    if (!validCustomersFound.length) {
                        var errorMessage = 'The file is empty.';
                        if (linesCount) {
                            errorMessage = 'No valid records were found in the file. Ensure it is CSV and each customer has an email.';
                        }
                        req.flash('error', errorMessage);
                        return res.redirect(config.baseUrl + '/upload'); // TODO unhardcode url
                    }
                    if (!missingCustomers.length) {
                        req.flash('warning', "All customers were already imported before.");
                        return res.redirect(config.baseUrl);
                    }
                    return async.forEachLimit(
                        missingCustomers,
                        4, // no more than 4 customer update requests at a time
                        function(customer, callback) {
                            debitoor.addCustomer(
                                customer,
                                function() {
                                    callback();
                                }
                            );
                        },
                        function() {
                            req.flash('success', missingCustomers.length + ' customers were imported successfully');
                            res.redirect(config.baseUrl);
                        }
                    );
                });
        });
    });

};

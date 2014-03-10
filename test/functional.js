var config = require('../config.json');
var express = require('express');
var should = require('should');
var request = require('request');
var fs = require('fs');
var path = require('path');
var cheerio = require('cheerio');

var authHeaders;

/**
 * options.followAllRedirects=true must work, but starts to trigger timeout somewhere during `npm test` without any reason
 * probably due to bug https://github.com/mikeal/request/issues/289
 * this
 * @param options
 * @param callback
 * @returns {*}
 */
function requestWithFollowRedirect(options, callback) {
    return request(
        options,
        function(err, response, body) {
            if ("still not fixed https://github.com/mikeal/request/issues/289") {
                if (response.statusCode == 302) {
                    request(
                        response.headers.location, function(err, response, body) {
                            callback(err, response, body);
                        });
                    return;
                }
            }
            callback(err, response, body);
        }
    );
}

function customersDeleteAll(callback) {
    requestWithFollowRedirect({
            uri: config.baseUrl + "/customers/delete",
            method: "POST",
            headers: {'cookie': authHeaders.cookie}
        },
        function(err, response, body) {
            callback(err, response, body);
        }
    );
}

function uploadFile(authHeaders, filename, callback) {
    requestWithFollowRedirect({
            uri: config.baseUrl + "/upload",
            method: "POST",
            headers: {
                'cookie': authHeaders.cookie,
                'content-type': 'multipart/form-data'
            },
            multipart: [
                {
                    'Content-Disposition': 'form-data; name="csvFile"; filename="' + filename + '"',
                    'Content-Type': 'text/csv',
                    body: fs.readFileSync(path.resolve(__dirname, "./samples/" + filename))
                }
            ]
        },
        function(err, response, body) {
            callback(body);
        }
    );
}

it('Authentication must work', function(done) {
    this.timeout(10000);

    request(
        config.baseUrl,
        function(err, response, body) {
            if (err) {
                throw err;
            }
            response.statusCode.should.equal(200);
            body.should.not.include("Log out");

            var $ = cheerio.load(body);
            var authorize = $('[name=authorize]').val();
            var lang = $('[name=lang]').val();
            var actionUrl = response.request.uri.href;

            request({
                uri: actionUrl,
                method: 'POST',
                followAllRedirects: true,
                form: {
                    email: config.debitoor.test_login,
                    password: config.debitoor.test_password,
                    authorize: authorize,
                    lang: lang
                }
            }, function(err, response, body) {

                response.statusCode.should.equal(200);
                body.should.include("Log out");
                body.should.include("Welcome back, username!");

                authHeaders = response.request.headers;

                done();
            });
        }
    );
});


describe('Debitoor integration', function() {

    before(function(done) {
        should.exist(authHeaders, "Authentication must work for further tests");
        done();
    });

    it('must show 404 on wrong URLs', function(done) {
        request(
            config.baseUrl + "/nonexisting/page",
            function(err, response, body) {
                response.statusCode.should.equal(404);
                body.should.include("Page not found.");
                done();
            });
    });

    it('must allow to upload CSV with customers', function(done) {

        this.timeout(10000);
        customersDeleteAll(function(){
            uploadFile(authHeaders, "customers.csv", function(body) {
                body.should.include("3 customers were imported successfully");
                done();
            });
        });

    });

    it('must shows error when upload empty CSV', function(done) {

        uploadFile(authHeaders, "empty.csv", function(body) {
            body.should.include("The file is empty");
            done();
        });

    });

    it('shows error when upload bad CSV', function(done) {

        uploadFile(authHeaders, "bad.csv", function(body) {
            body.should.include("No valid records were found in the file");
            done();
        });

    });

    it('must show error when delete nonexisting customer', function(done) {

        request({
                uri: config.baseUrl + "/customers/123456/delete",
                method: "POST",
                followAllRedirects: true,
                headers: {'cookie': authHeaders.cookie}
            },
            function(err, response, body) {
                body.should.include("Customer was not found");
                done();
            }
        );

    });

    it('must correctly delete customers', function(done) {

        this.timeout(10000);
        customersDeleteAll(function(err, res, body){
            body.should.include("Successfully removed all customers");
            body.should.include("There are no customers in your debitoor account yet");
            done();
        });

    });

    it('must correctly add customers when uploading', function(done) {

        this.timeout(10000);
        customersDeleteAll(function(){
            uploadFile(authHeaders, "customers.csv", function(body) {
                body.should.include("Denis Chmel");
                body.should.include("John, The First");
                body.should.include("Viktor Ivanov");

                var $ = cheerio.load(body);
                var customersCount = $('table.customers tbody tr').length;
                customersCount.should.equal(3);

                done();
            });
        });

    });

    it('must not add customers twice', function(done) {

        this.timeout(10000);
        customersDeleteAll(function(){
            uploadFile(authHeaders, "customers.csv", function() {
                uploadFile(authHeaders, "customers.csv", function(body) {

                    body.should.include("All customers were already imported before");

                    var $ = cheerio.load(body);
                    var customersCount = $('table.customers tbody tr').length;
                    customersCount.should.equal(3);

                    done();
                });
            });
        });

    });

});

var controller = require('../controllers');

module.exports = function (app) {
    app.get('/', controller.index);
    app.get('/upload', controller.uploadCsv);
    app.post('/upload', controller.uploadCsv);
    app.get('/logout', controller.logout);
    app.post('/customers/delete', controller.customersDeleteAll);
    app.post('/customers/:id/delete', controller.customerDelete);

    app.get('*', controller.page404);
};

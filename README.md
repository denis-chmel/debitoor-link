# Debitoor Link

Test app to sync email contacts with debitoor.com

## Installation

the app must become accessible on [http://localhost:5555](http://localhost:5555) after:
```
npm install
npm start
```

To run tests use `npm test`

## REST

API is not rich, in addition to upload I made deletion also:
```
app.get('/', controller.index);
app.get('/upload', controller.uploadCsv);
app.post('/upload', controller.uploadCsv);
app.get('/logout', controller.logout);
app.post('/customers/delete', controller.customersDeleteAll);
app.post('/customers/:id/delete', controller.customerDelete);
```

## Notes

That's my first nodejs child, so some moments I'd like to note:

- I didn't work much on UX/UI feeling that's out of scope :)
- there are only functional tests (REST API), as requested however
- CSV is coma-separated, see example in test/samples/customers.csv
- when uploading same csv >1 time - it won't re-add already existing customers (will check by email). One may expect to update the rest info, but I simplified that by intention here.
- I'm not sure I used proper OOP
- it smells to keep login/pass to debitoor in config.json (under git), I kept that for simplicity here
- app lacks of plural phrase detection (e.g. you may get "1 customers were...")

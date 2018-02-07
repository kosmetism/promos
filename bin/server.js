const path = require('path');
const express = require('express');

const port = process.env.PORT || 9292;
const app = express();

app.use(express.static(path.resolve(__dirname, '../dist')));
app.listen(port);

console.log('server started on http://localhost:%s', port);

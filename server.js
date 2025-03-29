const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const apiRoutes = require('./routes/apiroutes');
const PORT = 3000;
const app = express();

// app.use(cors());
app.use(bodyParser.json());
// console.log('app ',app)
app.use('/api/v1', apiRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

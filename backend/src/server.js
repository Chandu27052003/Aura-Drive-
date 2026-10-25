const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Apex Motors API running at http://localhost:${PORT}`);
});

const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Library API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Admin login: admin@library.com / admin123\n`);
});

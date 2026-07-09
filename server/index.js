const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/products', require('./routes/products'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/restocking', require('./routes/restocking'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/batches', require('./routes/batches'));
app.use('/api/owner', require('./routes/owner'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/expenses', require('./routes/expenses'));

// Serve client in production
const clientDist = path.join(__dirname, '../client/dist');
if (require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(Number(PORT), '0.0.0.0', () => {
  const interfaces = os.networkInterfaces();
  let localIP = 'localhost';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
  }
  console.log('\n🏪 AbarroTech Server iniciado');
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Red LAN: http://${localIP}:${PORT}`);
  console.log('\n   Otros dispositivos en la misma red WiFi pueden acceder usando la IP de red LAN.\n');
});

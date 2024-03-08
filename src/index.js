const express = require('express');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');
const mqtt = require('mqtt');

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

const mqttClient = mqtt.connect('mqtt://localhost'); // Altere o URL do broker MQTT conforme necessário

// Evento de conexão do cliente MQTT
mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe('cargaConnect', (err) => {
    if (err) {
      console.error('Error subscribing to topic:', err);
    } else {
      console.log('Subscribed to topic "cargaConnect"');
    }
  });
});

// Evento de recebimento de mensagem MQTT
mqttClient.on('message', async (topic, message) => {
  if (topic === 'cargaConnect') {
    try {
      const { latitude, longitude, idAparelho } = JSON.parse(message.toString());
      const location = await prisma.LOCALIZACAO.create({
        data: {
          LATITUDE: latitude,
          LONGITUDE: longitude,
          ID_APARELHO: idAparelho,
        }
      });
      console.log('Location saved:', location);
    } catch (error) {
      console.error('Error saving location:', error);
    }
  }
});

// Middleware para fazer o parse do corpo da requisição como JSON
app.use(bodyParser.json());

// Rota para cadastrar um novo aparelho
app.post('/cadastrar', async (req, res) => {
  try {
    const { descricao } = req.body;
    const aparelho = await prisma.APARELHO.create({
      data: {
        DESCRICAO: descricao
      }
    });
    res.status(200).json({ id: aparelho.ID });
  } catch (error) {
    console.error('Erro ao cadastrar aparelho:', error);
    res.status(400).json({ message: 'Erro previsto' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
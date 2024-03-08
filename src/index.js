const express = require('express');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');
const mqtt = require('mqtt');

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

// Configuração do MQTT
const mqttBrokerUrl = 'mqtt://localhost';
const mqttTopic = 'geolocation';

const mqttClient = mqtt.connect(mqttBrokerUrl);

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe(mqttTopic);
});

mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message);
    await saveLocationToDatabase(data);
  } catch (error) {
    console.error('Erro ao processar mensagem MQTT', error);
  }
});

// Função para salvar a localização no banco de dados
const saveLocationToDatabase = async (data) => {
  const { latitude, longitude, id } = data;
  try {
    const location = await prisma.LOCALIZACAO.create({
      data: {
        LATITUDE: latitude,
        LONGITUDE: longitude,
        ID_APARELHO: id
      }
    });
    console.log(`Localizacao do aparelho ${id} salva.`);
  } catch (error) {
    console.error(`Erro ao salvar localizacao do aparelho ${id}`, error);
  }
};

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
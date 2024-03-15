const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
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



// Middleware para fazer o parse do corpo da requisição como JSON
app.use(bodyParser.json());

app.use(cors());

// Rota para cadastrar um novo aparelho
app.post('/cadastro/aparelho', async (req, res) => {
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

// Rota para consultar todas as localizações mais recentes
app.get('/consulta', async (req, res) => {
  try {
    const localizacoes = await prisma.LOCALIZACAO.findMany({
      select: {
        LATITUDE: true,
        LONGITUDE: true,
        APARELHO: {
          select: {
            ID: true,
            DESCRICAO: true,
          }
        }
      },
      orderBy: {
        DATAHORA: 'desc'
      },
      distinct: ['ID_APARELHO']
    });

    let dados = [];
    localizacoes.map(localizacao => {
      dados.push({
        LATITUDE: localizacao.LATITUDE,
        LONGITUDE: localizacao.LONGITUDE,
        APARELHO_ID: localizacao.APARELHO.ID,
        APARELHO_DESCRICAO: localizacao.APARELHO.DESCRICAO,
      })
    });

    res.status(200).json(dados);
  } catch (error) {
    console.error('Erro ao consultar localizacoes:', error);
    res.status(400).json({ message: 'Erro previsto' });
  }
});

// Inicia o servidor
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  }
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
      io.emit('novaLocalizacao', {LATITUDE: location.LATITUDE, LONGITUDE: location.LONGITUDE}); // Envia a nova localização para todos os clientes conectados
    } catch (error) {
      console.error('Error saving location:', error);
    }
  }
});
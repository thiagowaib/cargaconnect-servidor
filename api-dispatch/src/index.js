const mqtt = require('mqtt');
var amqp = require('amqplib/callback_api');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * MQTT SETUP
 */
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
        await prisma.MENSAGENS.create({
        data: { 
            CONTEUDO: message.toString(),
            DATAHORAENVIO: null
        }
        });
        console.log('Mensagem gravada:', message.toString());
    } catch (error) {
        console.error('Erro ao salvar mensagem MQTT:', error);
    }
  }
});

/**
 * AMQP [SENDER] SETUP
 */

// Connect to localhost
amqp.connect('amqp://localhost', function(error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }
    var queue = 'carga-connect-dispatch';

    channel.assertQueue(queue, {
      durable: true
    });

    setInterval(async () => {
        const mensagens = await prisma.MENSAGENS.findMany({
            select: {
                ID: true,
                CONTEUDO: true
            },
            where: {
                DATAHORAENVIO: null,
            },
            orderBy: {
                DATAHORA: 'asc' 
            }
        });

        let idsAtualizar = mensagens.map(msg => { return msg.ID });

        await prisma.MENSAGENS.updateMany({
            where: {
                ID: {
                    in: idsAtualizar,
                },
            },
            data: {
                DATAHORAENVIO: new Date(),
            },
        })

        mensagens.forEach(msg => {
            channel.sendToQueue(queue, Buffer.from(msg.CONTEUDO), {
                persistent: true
            });
            console.log(" [x] Sent '%s'", msg.CONTEUDO);
        });

    }, 5000);
    
    // connection.close();
    // process.exit(0)
  });
});


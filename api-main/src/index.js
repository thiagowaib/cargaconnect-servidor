/**
 * ==========================================
 * Importações
 * ==========================================
 */
const { PrismaClient } = require('@prisma/client');
const express          = require('express');
const bodyParser       = require('body-parser');
const cors             = require('cors');
const amqp             = require('amqplib/callback_api');
const Keyv             = require('keyv');
const { loadPackageDefinition } = require('@grpc/grpc-js');
const { loadSync }              = require('@grpc/proto-loader');
const packageDefinition         = loadSync('./../api-metrics/src/metrics.proto');
const grpcObject                = loadPackageDefinition(packageDefinition);
const metricsPackage            = grpcObject.metrics;

const prisma = new PrismaClient();
const cache  = new Keyv();
const app    = express();
const PORT   = 3000;
let cacheIdx = 0;

/**
 * ==========================================
 * Configuração do Client GRPC
 * ==========================================
 */
const { credentials, Client } = require('@grpc/grpc-js');
const client = new metricsPackage.Metrics(
  'localhost:50051',
  credentials.createInsecure()
);

/**
 * ==========================================
 * Roteamento API - RESTful
 * ==========================================
 */
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

    // Remove o cache da consulta de aparelhos
    await cache.delete(`rest::/consulta/aparelhos`);

    res.status(200).json({ id: aparelho.ID });
  } catch (error) {
    console.error('Erro ao cadastrar aparelho:', error);
    res.status(400).json({ message: 'Nao foi possivel cadastrar aparelho', error });
  }
});

// Rota para cadastrar um novo motorista
app.post('/cadastro/motorista', async (req, res) => {
  try {
    const { nome } = req.body;
    const motorista = await prisma.MOTORISTA.create({
      data: {
        NOME: nome
      }
    });
    res.status(200).json({ codigo: motorista.CODIGO });
  } catch (error) {
    console.error('Erro ao cadastrar motorista:', error);
    res.status(400).json({ message: 'Nao foi possivel cadastrar motorista', error});
  }
});

// Rota para cadastrar um novo veiculo
app.post('/cadastro/veiculo', async (req, res) => {
  try {
    const { descricao, aparelho, tipo, motorista} = req.body;
    const veiculo = await prisma.VEICULO.create({
      data: {
        DESCRICAO: descricao,
        APARELHO_ID: aparelho,
        TIPO_CODIGO: tipo,
        MOTORISTA_CODIGO: motorista
      }
    });
    res.status(200).json({ id: veiculo.ID });
  } catch (error) {
    console.error('Erro ao cadastrar veiculo:', error);
    res.status(400).json({ message: 'Nao foi possivel cadastrar veiculo', error});
  }
});

// Rota para consultar todas as localizações mais recentes
app.get('/consulta', async (req, res) => {
  try {
    // Verifica se há consulta salva em cache
    const cacheData = await cache.get('rest::/consulta');
    // Caso exista o retorno da consulta em cache, retorna-a
    if(cacheData != null) {
      res.status(200).json(cacheData);
    } 
    // Caso contrario, realiza a consulta no banco
    else {
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
          DATAHORA: 'asc'
        },
        distinct: ['ID_APARELHO']
      });

      let dados = [];

      // Carrega um array de dados de retorno
      localizacoes.forEach(localizacao => {
        dados.push({
          LATITUDE: localizacao.LATITUDE,
          LONGITUDE: localizacao.LONGITUDE,
          APARELHO_ID: localizacao.APARELHO.ID,
          APARELHO_DESCRICAO: localizacao.APARELHO.DESCRICAO,
        })
      });

      // Salva em cache o resultado da consulta
      await cache.set(`rest::/consulta`, dados, (1000*60*60*24));

      res.status(200).json(dados);
    }
  } catch (error) {
    console.error('Erro ao consultar localizacoes:', error);
    res.status(400).json({ message: 'Erro ao consultar localizacoes', error });
  }
});

// Rota para consultar a lista de aparelhos cadastrados
app.get('/consulta/aparelhos', async (req, res) => {
  try {
    // Verifica se há consulta salva em cache
    const cacheData = await cache.get('rest::/consulta/aparelhos');

    // Caso exista o retorno da consulta em cache, retorna-a
    if(cacheData != null) {
      res.status(200).json(cacheData)
    } 
    // Caso contrario, realiza a consulta no banco
    else {
      const aparelhos = await prisma.APARELHO.findMany({
        select: {
          ID: true,
          DESCRICAO: true
        },
        orderBy: {
          DESCRICAO: 'desc'
        }
      });

      // Salva em cache o resultado da consulta
      await cache.set(`rest::/consulta/aparelhos`, aparelhos, (1000*60*60*24));
      res.status(200).json(aparelhos);
    }
  } catch (error) {
    console.error('Erro ao consultar aparelhos:', error);
    res.status(400).json({ message: 'Erro ao consultar aparelhos', error });
  }
});

// Rota para consultar o historico de localizacoes de um aparelho
app.get('/consulta/historico/:idAparelho&:limiteHistorico', async (req, res) => {
  try {
    const {idAparelho, limiteHistorico} = req.params;

    // Calcula a data atual - limite historico (horas)
    let dataHistorico = new Date();
    dataHistorico.setHours(dataHistorico.getHours() - limiteHistorico)

    const localizacoes = await prisma.LOCALIZACAO.findMany({
      select: {
        LATITUDE: true,
        LONGITUDE: true,
        DATAHORA: true,
        APARELHO: {
          select: {
            ID: true,
            DESCRICAO: true,
          }
        }
      },
      where: {
        ID_APARELHO: idAparelho,
        DATAHORA: {gte: dataHistorico}
      },
      orderBy: {
        DATAHORA: 'desc'
      }
    });

    let dados = [];

    // Carrega um array de dados de retorno
    localizacoes.forEach(localizacao => {
      dados.push({
        LATITUDE: localizacao.LATITUDE,
        LONGITUDE: localizacao.LONGITUDE,
        APARELHO_ID: localizacao.APARELHO.ID,
        APARELHO_DESCRICAO: localizacao.APARELHO.DESCRICAO,
        DATAHORA: localizacao.DATAHORA
      })
    });

    res.status(200).json(dados);
  } catch (error) {
    console.error('Erro ao consultar historico de localizacoes:', error);
    res.status(400).json({ message: 'Erro ao consultar historico de localizacoes', error });
  }
});

/**
 * ==========================================
 * Instanciação do Servidor
 * ==========================================
 */
const server = app.listen(PORT, () => {
  console.log(`Servidor executando na porta ${PORT}`);
});
/**
 * ==========================================
 * Instanciação do Socket
 * ==========================================
 */
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  }
});

/**
 * ==========================================
 * Instanciação do broker AMQP - Recebimento
 * ==========================================
 */
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
    
    console.log(" [*] Aguardando mensagens AMQP.");
    channel.consume(queue, async function(msg) {
      
      console.log(" [x] Nova mensagem recebida, processando...");
      try {
        const { latitude, longitude, idAparelho } = JSON.parse(msg.content.toString());

        // Busca ultima localizacao para calcular distancia percorrida
        const ultimaLocalizacao = await prisma.LOCALIZACAO.findFirst({
          where: {
            ID_APARELHO: idAparelho
          },
          orderBy: {
            DATAHORA: 'desc'
          },
        })

        const location = await prisma.LOCALIZACAO.create({
          data: {
            LATITUDE: latitude,
            LONGITUDE: longitude,
            ID_APARELHO: idAparelho,
          }
        });

        // Chama a função para computar a distancia
        client.computeMetric({
          x1: ultimaLocalizacao ? ultimaLocalizacao.LATITUDE : location.LATITUDE,
          y1: ultimaLocalizacao ? ultimaLocalizacao.LONGITUDE : location.LONGITUDE,
          x2: location.LATITUDE,
          y2: location.LONGITUDE,
          aparelho: location.ID_APARELHO,
        }, (error, response) => {
          if(error){
            console.error("Houve um erro ao computar a distancia do aparelho: " + idAparelho)
          } else {
            console.log("Distancia computada para o aparelho: " + idAparelho + " >> " + response.distancia)
          }
        })

        // Remove o cache da consulta de aparelhos
        await cache.delete(`rest::/consulta`);

        // Emite uma mensagem via Socket para o cliente (navegador)
        io.emit('novaLocalizacao', {LATITUDE: location.LATITUDE, LONGITUDE: location.LONGITUDE}); // Envia a nova localização para todos os clientes conectados
      } catch (error) {
        console.error('Erro ao salvar localizacao:', error);
      }

      console.log(" [x] Done");
      channel.ack(msg);
    }, {
      noAck: false
    });
  });
});

// mosquitto_pub -t cargaConnect -m '{"latitude": -22.640685, "longitude": -50.403998, "idAparelho": "16b265f3-4c94-4a04-aad5-fff65707f958"}'
// mosquitto_pub -t cargaConnect -m '{"latitude": -22.327700, "longitude": -49.093848, "idAparelho": "24a14731-0485-4ab0-b1cd-537cbb1d7585"}'
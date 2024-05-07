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

const prisma = new PrismaClient();
const cache  = new Keyv();
const app    = express();
const PORT   = 3000;
let cacheIdx = 0;


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

// Rota para cadastrar um novo motorista
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

    // Data atual - 3 dias
    let d = new Date();
    d.setDate(d.getDate() - 3);

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

    // for(let i=0; i < cacheIdx; i++) {
    //   let value = await cache.get(`${i}`)
    //   dados.push({
    //     LATITUDE: value.latitude,
    //     LONGITUDE: value.longitude,
    //     APARELHO_ID: value.id,
    //     APARELHO_DESCRICAO: value.descricao,
    //   })
    // }

    // Carrega um array de dados de retorno
    localizacoes.forEach(localizacao => {
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
    res.status(400).json({ message: 'Erro ao consultar localizacoes', error });
  }
});

// Rota para consultar a lista de aparelhos cadastrados
app.get('/consulta/aparelhos', async (req, res) => {
  try {

    const aparelhos = await prisma.APARELHO.findMany({
      select: {
        ID: true,
        DESCRICAO: true
      },
      orderBy: {
        DESCRICAO: 'asc'
      }
    });

    res.status(200).json(aparelhos);
  } catch (error) {
    console.error('Erro ao consultar aparelhos:', error);
    res.status(400).json({ message: 'Erro ao consultar aparelhos', error });
  }
});

// Rota para consultar o historico de localizacoes de um aparelho
app.get('/consulta', async (req, res) => {
  try {

    // Data atual - 3 dias
    let d = new Date();
    d.setDate(d.getDate() - 3);

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

    // for(let i=0; i < cacheIdx; i++) {
    //   let value = await cache.get(`${i}`)
    //   dados.push({
    //     LATITUDE: value.latitude,
    //     LONGITUDE: value.longitude,
    //     APARELHO_ID: value.id,
    //     APARELHO_DESCRICAO: value.descricao,
    //   })
    // }

    // Carrega um array de dados de retorno
    localizacoes.forEach(localizacao => {
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
    res.status(400).json({ message: 'Erro ao consultar localizacoes', error });
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
        const location = await prisma.LOCALIZACAO.create({
          data: {
            LATITUDE: latitude,
            LONGITUDE: longitude,
            ID_APARELHO: idAparelho,
          }
        });
        console.log('Location saved:', location);

        const aparelho = await prisma.APARELHO.findUnique({
          where: {
            ID: idAparelho
          }
        })

        // Salva em cache >>>  ID: {LAT, LONG, DATAHORA}
        await cache.set(`${cacheIdx++}`, {latitude, longitude, datahora: location.DATAHORA, id: aparelho.ID, descricao: aparelho.DESCRICAO}, (1000*60*60*24*3));

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

// mosquitto_pub -t cargaConnect -m '{"latitude": 42.456, "longitude": 22.012, "idAparelho": "16b265f3-4c94-4a04-aad5-fff65707f958"}'
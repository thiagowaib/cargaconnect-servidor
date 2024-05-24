/**
 * ==========================================
 * Importações
 * ==========================================
 */
const { loadPackageDefinition }     = require('@grpc/grpc-js');
const { loadSync }                  = require('@grpc/proto-loader');
const packageDefinition             = loadSync('./src/metrics.proto');
const grpcObject                    = loadPackageDefinition(packageDefinition);
const metricsPackage                = grpcObject.metrics;
const { PrismaClient }              = require('@prisma/client');
const { ServerCredentials, Server } = require('@grpc/grpc-js');

const prisma = new PrismaClient();
const server = new Server();

/**
 * ==========================================
 * Configuração GRPC
 * ==========================================
 */
server.addService(metricsPackage.Metrics.service, {
  computeMetric: async (call, callback) => {
    try {
      // Busca dados da requisição
      const {aparelho, x1, y1, x2, y2} = call.request;

      // Calcula a data de hoje
      let dataHoje = new Date();
      dataHoje     = dataHoje.toISOString().split('T')[0];

      // Calcula a distancia com base nos pontos
      const R = 6371; // Raio da Terra em quilômetros
      const dLat = (x2 - x1) * Math.PI / 180; // Convertendo a diferença de latitude para radianos
      const dLon = (y2 - y1) * Math.PI / 180; // Convertendo a diferença de longitude para radianos
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(x1 * Math.PI / 180) * Math.cos(x2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2); 
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
      let distancia = R * c; // Distância em quilômetros

      // Procura Registro Existente
      const registroExistente = await prisma.METRICAS.findFirst({
        where: {
          AND: [{APARELHO_ID: aparelho}, {DATA: dataHoje}]
        }
      })
      // Se achar -> Atualiza
      if(registroExistente) {
        distancia += registroExistente.DISTANCIA;
        await prisma.METRICAS.update({
          where: {
            ID: registroExistente.ID,
          },
          data: {
            DISTANCIA: distancia
          }
        })
      }
      // Se não achar -> cria
      else {
        await prisma.METRICAS.create({
          data: {
              APARELHO_ID: aparelho,
              DISTANCIA: distancia,
              DATA: dataHoje
          }
        })
      }
      callback(null, { distancia });
  } catch (error) {
      console.error('Erro ao computar distância:', error);
      callback(null, { distancia: -1 });
    }
  }
});

server.bindAsync('localhost:50051', ServerCredentials.createInsecure(), () => {
  console.log('API de Metricas rodando em localhost:50051');
});
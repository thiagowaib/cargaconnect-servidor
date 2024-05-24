const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Define o schema GraphQL
const typeDefs = gql`
  type Query {
    consultarDistancias(APARELHO_ID: String!, DATA: String): [Metrica]
  }

  type Metrica {
    ID: String
    DISTANCIA: Float
    APARELHO_ID: String
    DATA: String
  }
`;

// Define os resolvers GraphQL
const resolvers = {
  Query: {
    consultarDistancias: async (_, { aparelhoId, data }) => {
        console.log({aparelhoId, data})
      // Lógica para consultar distâncias no banco de dados (usando Prisma)
      const distancias = await prisma.METRICAS.findMany({
        where: {
          APARELHO_ID: aparelhoId,
          DATA: data, // Condição opcional para filtrar por data, se fornecida
        },
      });
      return distancias;
    },
  },
};

// Cria uma instância do servidor Apollo com o schema e os resolvers
const server = new ApolloServer({ typeDefs, resolvers });

const app = express();

// Aplica o middleware do servidor Apollo no Express
const init = async () => {
    await server.start()
    server.applyMiddleware({ app });
    
    // Define a porta em que o servidor irá escutar
    const PORT = process.env.PORT || 4000;
    
    // Inicializa o servidor
    app.listen(PORT, () => {
      console.log(`Servidor GraphQL está rodando em http://localhost:${PORT}${server.graphqlPath}`);
    });
    
}

init();

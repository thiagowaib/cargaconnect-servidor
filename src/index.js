const { PrismaClient } = require('@prisma/client');
const express = require('express');
const bodyParser = require('body-parser');

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

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
      res.status(200).json({ msg: "Aparelho cadastrado com sucesso.", id: aparelho.ID });
    } catch (error) {
      console.error('Erro ao cadastrar aparelho:', error);
      res.status(400).json({ message: 'Nao foi possivel criar o aparelho' });
    }
});

// Endpoint para consultar todas as informações de geolocalização armazenadas
// app.get('/geolocations', async (req, res) => {
//   try {
//     const locations = await prisma.location.findMany();
//     res.status(200).json({ success: true, locations });
//   } catch (error) {
//     console.error('Error fetching locations:', error);
//     res.status(500).json({ success: false, error: 'Failed to fetch locations' });
//   }
// });

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
